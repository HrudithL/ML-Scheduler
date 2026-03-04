import { supabase } from "@/lib/supabase";
import { googleCalendarService } from "@/services/GoogleCalendarService";
import type {
  Task,
  TaskInsert,
  TaskUpdate,
  TaskEventInsert,
  TaskState,
} from "@/types/models";

/**
 * Compute a human-readable summary of what fields changed between oldTask and patch.
 */
function computeChangesSummary(oldTask: Task, patch: TaskUpdate): string {
  const changes: string[] = [];
  const fieldLabels: Record<string, string> = {
    title: "Title",
    description: "Description",
    state: "State",
    category: "Category",
    task_type: "Task Type",
    hard_deadline: "Hard Deadline",
    estimated_minutes: "Estimated Minutes",
    priority_label: "Priority",
    importance: "Importance",
    difficulty: "Difficulty",
    due_at: "Due Date",
    planned_start_at: "Planned Start",
    planned_end_at: "Planned End",
    course_id: "Course",
    log_date: "Log Date",
  };

  for (const [key, label] of Object.entries(fieldLabels)) {
    if (key in patch) {
      const oldVal = (oldTask as any)[key];
      const newVal = (patch as any)[key];
      if (oldVal !== newVal) {
        const oldDisplay =
          oldVal === null || oldVal === undefined ? "(none)" : String(oldVal);
        const newDisplay =
          newVal === null || newVal === undefined ? "(none)" : String(newVal);
        changes.push(`${label}: "${oldDisplay}" → "${newDisplay}"`);
      }
    }
  }

  return changes.length > 0 ? changes.join("; ") : "No fields changed";
}

/**
 * TaskService - Singleton service for task mutations with automatic event logging
 *
 * All task mutations go through this service to ensure consistent event tracking.
 * Each operation reads the current state, performs the update, logs the event,
 * and returns the updated task.
 */
class TaskService {
  private static instance: TaskService;

  private constructor() {}

  /**
   * Get the singleton instance of TaskService
   */
  static getInstance(): TaskService {
    if (!TaskService.instance) {
      TaskService.instance = new TaskService();
    }
    return TaskService.instance;
  }

  /**
   * Create a new task and log the creation event
   */
  async createTask(data: TaskInsert): Promise<Task> {
    try {
      // Insert the task
      const { data: task, error: taskError } = await supabase
        .from("tasks")
        .insert(data as any)
        .select()
        .single<Task>();

      if (taskError) throw taskError;
      if (!task) throw new Error("Failed to create task");

      // Log the creation event
      const eventData: TaskEventInsert = {
        task_id: task.id,
        event_type: "created",
        payload: { task_data: data } as any,
        new_state: task.state,
        changes_summary: `Task created: "${task.title}"`,
      };

      const { error: eventError } = await supabase
        .from("task_events")
        .insert(eventData as any);

      if (eventError) {
        console.error("Failed to log task creation event:", eventError);
      }

      // Sync to Google Calendar & Tasks (fire-and-forget)
      googleCalendarService.syncTask(task.id).catch(() => {});

      return task;
    } catch (error) {
      console.error("Error creating task:", error);
      throw error;
    }
  }

  /**
   * Update a task with a partial patch and log the update event
   */
  async updateTask(taskId: string, patch: TaskUpdate): Promise<Task> {
    try {
      // Read the current task state
      const { data: oldTask, error: readError } = await supabase
        .from("tasks")
        .select()
        .eq("id", taskId)
        .single<Task>();

      if (readError) throw readError;
      if (!oldTask) throw new Error(`Task ${taskId} not found`);

      // Update the task
      const { data: updatedTask, error: updateError } = await supabase
        .from("tasks")
        .update(patch as unknown as never)
        .eq("id", taskId)
        .select()
        .single<Task>();

      if (updateError) throw updateError;
      if (!updatedTask) throw new Error("Failed to update task");

      // Log the update event with detailed changes_summary
      const changesSummary = computeChangesSummary(oldTask, patch);
      const eventData: TaskEventInsert = {
        task_id: taskId,
        event_type: "updated",
        payload: {
          old_values: oldTask,
          new_values: patch,
        } as any,
        old_state: oldTask.state,
        new_state: updatedTask.state,
        changes_summary: changesSummary,
      };

      const { error: eventError } = await supabase
        .from("task_events")
        .insert(eventData as any);

      if (eventError) {
        console.error("Failed to log task update event:", eventError);
      }

      // Sync to Google Calendar & Tasks (fire-and-forget)
      googleCalendarService.syncTask(taskId).catch(() => {});

      return updatedTask;
    } catch (error) {
      console.error("Error updating task:", error);
      throw error;
    }
  }

  /**
   * Transition a task to a new state and log the state change
   * If transitioning to 'done', also logs a 'completed' event
   */
  async transitionState(
    taskId: string,
    newState: TaskState,
    completedAt?: Date,
  ): Promise<Task> {
    try {
      // Read the current task state
      const { data: oldTask, error: readError } = await supabase
        .from("tasks")
        .select()
        .eq("id", taskId)
        .single<Task>();

      if (readError) throw readError;
      if (!oldTask) throw new Error(`Task ${taskId} not found`);

      // Prepare the update
      const update: TaskUpdate = {
        state: newState,
      };

      // If transitioning to 'done', set completed_at
      if (newState === "done") {
        update.completed_at = (completedAt || new Date()).toISOString();
      }

      // Update the task
      const { data: updatedTask, error: updateError } = await supabase
        .from("tasks")
        .update(update as unknown as never)
        .eq("id", taskId)
        .select()
        .single<Task>();

      if (updateError) throw updateError;
      if (!updatedTask) throw new Error("Failed to update task state");

      // Log the state change event with changes_summary
      const isResuming =
        (oldTask.state === "blocked" || oldTask.state === "paused") &&
        (newState === "in_progress" || newState === "planned");
      const eventType =
        newState === "done"
          ? "completed"
          : isResuming
            ? "resumed"
            : newState === "paused"
              ? "paused"
              : "state_change";

      const changesSummary = `State: "${oldTask.state}" → "${newState}"${isResuming ? " (Resumed)" : ""}`;

      const eventData: TaskEventInsert = {
        task_id: taskId,
        event_type: eventType,
        payload: {
          old_state: oldTask.state,
          new_state: newState,
        } as any,
        old_state: oldTask.state,
        new_state: newState,
        changes_summary: changesSummary,
      };

      const { error: eventError } = await supabase
        .from("task_events")
        .insert(eventData as any);

      if (eventError) {
        console.error("Failed to log task state change event:", eventError);
      }

      // Sync to Google Calendar & Tasks (fire-and-forget)
      googleCalendarService.syncTask(taskId).catch(() => {});

      return updatedTask;
    } catch (error) {
      console.error("Error transitioning task state:", error);
      throw error;
    }
  }

  /**
   * Update the planned time block for a task
   */
  async updatePlannedBlock(
    taskId: string,
    startAt: Date | null,
    endAt: Date | null,
  ): Promise<Task> {
    try {
      // Read the current task state
      const { data: oldTask, error: readError } = await supabase
        .from("tasks")
        .select()
        .eq("id", taskId)
        .single<Task>();

      if (readError) throw readError;
      if (!oldTask) throw new Error(`Task ${taskId} not found`);

      // Update the planned times
      const update: TaskUpdate = {
        planned_start_at: startAt ? startAt.toISOString() : null,
        planned_end_at: endAt ? endAt.toISOString() : null,
      };

      const { data: updatedTask, error: updateError } = await supabase
        .from("tasks")
        .update(update as unknown as never)
        .eq("id", taskId)
        .select()
        .single<Task>();

      if (updateError) throw updateError;
      if (!updatedTask) throw new Error("Failed to update planned block");

      // Log the planned block update event
      const changes: string[] = [];
      if (oldTask.planned_start_at !== update.planned_start_at) {
        changes.push(
          `Planned Start: "${oldTask.planned_start_at || "(none)"}" → "${update.planned_start_at || "(none)"}"`,
        );
      }
      if (oldTask.planned_end_at !== update.planned_end_at) {
        changes.push(
          `Planned End: "${oldTask.planned_end_at || "(none)"}" → "${update.planned_end_at || "(none)"}"`,
        );
      }

      const eventData: TaskEventInsert = {
        task_id: taskId,
        event_type: "updated_planned_block",
        payload: {
          old_planned_start: oldTask.planned_start_at,
          old_planned_end: oldTask.planned_end_at,
          new_planned_start: update.planned_start_at,
          new_planned_end: update.planned_end_at,
        } as any,
        old_planned_start_at: oldTask.planned_start_at,
        new_planned_start_at: update.planned_start_at,
        old_planned_end_at: oldTask.planned_end_at,
        new_planned_end_at: update.planned_end_at,
        changes_summary: changes.join("; ") || "No changes",
      };

      const { error: eventError } = await supabase
        .from("task_events")
        .insert(eventData as any);

      if (eventError) {
        console.error("Failed to log planned block update event:", eventError);
      }

      // Sync to Google Calendar & Tasks (fire-and-forget)
      googleCalendarService.syncTask(taskId).catch(() => {});

      return updatedTask;
    } catch (error) {
      console.error("Error updating planned block:", error);
      throw error;
    }
  }

  /**
   * Update the due date for a task
   */
  async updateDueDate(taskId: string, dueAt: Date | null): Promise<Task> {
    try {
      // Read the current task state
      const { data: oldTask, error: readError } = await supabase
        .from("tasks")
        .select()
        .eq("id", taskId)
        .single<Task>();

      if (readError) throw readError;
      if (!oldTask) throw new Error(`Task ${taskId} not found`);

      // Update the due date
      const update: TaskUpdate = {
        due_at: dueAt ? dueAt.toISOString() : null,
      };

      const { data: updatedTask, error: updateError } = await supabase
        .from("tasks")
        .update(update as unknown as never)
        .eq("id", taskId)
        .select()
        .single<Task>();

      if (updateError) throw updateError;
      if (!updatedTask) throw new Error("Failed to update due date");

      // Log the due date update event
      const dueSummary = `Due Date: "${oldTask.due_at || "(none)"}" → "${update.due_at || "(none)"}"`;
      const eventData: TaskEventInsert = {
        task_id: taskId,
        event_type: "updated_due",
        payload: {
          old_due_at: oldTask.due_at,
          new_due_at: update.due_at,
        } as any,
        old_due_at: oldTask.due_at,
        new_due_at: update.due_at,
        changes_summary: dueSummary,
      };

      const { error: eventError } = await supabase
        .from("task_events")
        .insert(eventData as any);

      if (eventError) {
        console.error("Failed to log due date update event:", eventError);
      }

      // Sync to Google Calendar & Tasks (fire-and-forget)
      googleCalendarService.syncTask(taskId).catch(() => {});

      return updatedTask;
    } catch (error) {
      console.error("Error updating due date:", error);
      throw error;
    }
  }

  /**
   * Delete a task (logs a deletion event before deletion)
   * Note: task_events will be cascade deleted due to ON DELETE CASCADE
   */
  async deleteTask(taskId: string): Promise<void> {
    try {
      // Read the current task state before deletion
      const { data: task, error: readError } = await supabase
        .from("tasks")
        .select()
        .eq("id", taskId)
        .single<Task>();

      if (readError) throw readError;
      if (!task) throw new Error(`Task ${taskId} not found`);

      // Log the deletion event BEFORE deleting
      const eventData: TaskEventInsert = {
        task_id: taskId,
        event_type: "deleted",
        payload: {
          deleted_task: task,
        } as any,
        old_state: task.state,
        changes_summary: `Task deleted: "${task.title}"`,
      };

      const { error: eventError } = await supabase
        .from("task_events")
        .insert(eventData as any);

      if (eventError) {
        console.error("Failed to log task deletion event:", eventError);
      }

      // Delete synced Google Calendar event and Task first (fire-and-forget)
      await googleCalendarService.deleteSyncedTask(taskId).catch(() => {});

      // Delete the task (will cascade delete all events including the one we just created)
      const { error: deleteError } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId);

      if (deleteError) throw deleteError;
    } catch (error) {
      console.error("Error deleting task:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const taskService = TaskService.getInstance();
export default taskService;
