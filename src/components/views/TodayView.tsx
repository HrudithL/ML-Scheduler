import { useEffect, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { taskService } from "@/services/TaskService";
import { getRiskScoreColor } from "@/lib/riskScore";
import type { TaskEnriched, Course } from "@/types/models";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const EMPTY_TASK_FORM = {
  title: "",
  description: "",
  category: "",
  estimated_minutes: "",
  difficulty: "",
  priority_label: "medium",
  course_id: "",
  due_at: "",
  planned_date: "",
  planned_start_time: "",
  planned_end_time: "",
};

function getFormDefaults() {
  const today = format(new Date(), "yyyy-MM-dd");
  return {
    ...EMPTY_TASK_FORM,
    due_at: `${today}T23:59`,
    planned_date: today,
  };
}

function computeMinutesFromTimeRange(
  startTime: string,
  endTime: string,
): number {
  if (!startTime || !endTime) return 0;
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const diff = eh * 60 + em - (sh * 60 + sm);
  return diff > 0 ? diff : 0;
}

function formatMinutes(minutes: number | null): string {
  if (!minutes) return "—";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function TodayView() {
  const [tasks, setTasks] = useState<TaskEnriched[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskEnriched | null>(null);
  const { toast } = useToast();

  // New task form state
  const [newTask, setNewTask] = useState(getFormDefaults());
  // Edit task form state
  const [editForm, setEditForm] = useState({ ...EMPTY_TASK_FORM });

  useEffect(() => {
    fetchTasks();
    fetchCourses();
  }, []);

  async function fetchCourses() {
    try {
      const { data } = await supabase
        .from("courses")
        .select("*")
        .order("name", { ascending: true });
      setCourses(data || []);
    } catch (err) {
      console.error("Error fetching courses:", err);
    }
  }

  async function fetchTasks() {
    try {
      setLoading(true);
      setError(null);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStart = today.toISOString();

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const todayEnd = tomorrow.toISOString();

      const { data, error: fetchError } = await supabase
        .from("tasks_enriched")
        .select("*")
        .or(
          `state.in.(planned,in_progress,blocked,paused),and(planned_start_at.gte.${todayStart},planned_start_at.lt.${todayEnd}),and(planned_end_at.gte.${todayStart},planned_end_at.lt.${todayEnd})`,
        )
        .order("risk_score", { ascending: false });

      if (fetchError) throw fetchError;

      setTasks(data || []);
    } catch (err) {
      console.error("Error fetching tasks:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch tasks");
      toast({
        title: "Error",
        description: "Failed to load today's tasks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleStateTransition(
    taskId: string,
    newState:
      | "in_progress"
      | "done"
      | "blocked"
      | "paused"
      | "dropped"
      | "planned",
  ) {
    try {
      await taskService.transitionState(taskId, newState);
      const labels: Record<string, string> = {
        in_progress: "started",
        done: "completed",
        blocked: "blocked",
        paused: "paused",
        dropped: "dropped",
        planned: "resumed to planned",
      };
      toast({
        title: "Success",
        description: `Task ${labels[newState] || "updated"}`,
      });
      await fetchTasks();
    } catch (err) {
      console.error("Error transitioning task:", err);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    }
  }

  async function handleCreateTask() {
    try {
      if (!newTask.title.trim()) {
        toast({
          title: "Error",
          description: "Task title is required",
          variant: "destructive",
        });
        return;
      }

      await taskService.createTask({
        title: newTask.title,
        description: newTask.description || null,
        category: (newTask.category as any) || null,
        estimated_minutes: newTask.estimated_minutes
          ? parseInt(newTask.estimated_minutes, 10)
          : null,
        difficulty: (newTask.difficulty as any) || null,
        priority_label: (newTask.priority_label as any) || "medium",
        state: "planned",
        course_id: newTask.course_id || null,
        due_at: newTask.due_at ? new Date(newTask.due_at).toISOString() : null,
        planned_start_at:
          newTask.planned_date && newTask.planned_start_time
            ? new Date(
                `${newTask.planned_date}T${newTask.planned_start_time}`,
              ).toISOString()
            : null,
        planned_end_at:
          newTask.planned_date && newTask.planned_end_time
            ? new Date(
                `${newTask.planned_date}T${newTask.planned_end_time}`,
              ).toISOString()
            : null,
      });

      toast({
        title: "Success",
        description: "Task created successfully",
      });

      setNewTask(getFormDefaults());
      setIsDialogOpen(false);
      await fetchTasks();
    } catch (err) {
      console.error("Error creating task:", err);
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      });
    }
  }

  function openEditDialog(task: TaskEnriched) {
    setEditingTask(task);
    const startDate = task.planned_start_at
      ? task.planned_start_at.slice(0, 10)
      : format(new Date(), "yyyy-MM-dd");
    const startTime = task.planned_start_at
      ? task.planned_start_at.slice(11, 16)
      : "";
    const endTime = task.planned_end_at
      ? task.planned_end_at.slice(11, 16)
      : "";
    setEditForm({
      title: task.title,
      description: task.description || "",
      category: task.category || "",
      estimated_minutes: task.estimated_minutes
        ? String(task.estimated_minutes)
        : "",
      difficulty: task.difficulty || "",
      priority_label: task.priority_label || "medium",
      course_id: task.course_id || "",
      due_at: task.due_at ? task.due_at.slice(0, 16) : "",
      planned_date: startDate,
      planned_start_time: startTime,
      planned_end_time: endTime,
    });
    setIsEditDialogOpen(true);
  }

  async function handleEditTask() {
    if (!editingTask) return;
    try {
      if (!editForm.title.trim()) {
        toast({
          title: "Error",
          description: "Task title is required",
          variant: "destructive",
        });
        return;
      }

      await taskService.updateTask(editingTask.id, {
        title: editForm.title,
        description: editForm.description || null,
        category: (editForm.category as any) || null,
        estimated_minutes: editForm.estimated_minutes
          ? parseInt(editForm.estimated_minutes, 10)
          : null,
        difficulty: (editForm.difficulty as any) || null,
        priority_label: (editForm.priority_label as any) || "medium",
        course_id: editForm.course_id || null,
        due_at: editForm.due_at
          ? new Date(editForm.due_at).toISOString()
          : null,
        planned_start_at:
          editForm.planned_date && editForm.planned_start_time
            ? new Date(
                `${editForm.planned_date}T${editForm.planned_start_time}`,
              ).toISOString()
            : null,
        planned_end_at:
          editForm.planned_date && editForm.planned_end_time
            ? new Date(
                `${editForm.planned_date}T${editForm.planned_end_time}`,
              ).toISOString()
            : null,
      });

      toast({ title: "Success", description: "Task updated successfully" });
      setIsEditDialogOpen(false);
      setEditingTask(null);
      await fetchTasks();
    } catch (err) {
      console.error("Error updating task:", err);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    }
  }

  function formatDateTime(datetime: string | null) {
    if (!datetime) return "Not set";
    try {
      return format(new Date(datetime), "MMM d, h:mm a");
    } catch {
      return "Invalid date";
    }
  }

  function getCourseName(courseId: string | null) {
    if (!courseId) return null;
    const course = courses.find((c) => c.id === courseId);
    return course ? course.name : null;
  }

  function getStateBadgeVariant(state: string) {
    switch (state) {
      case "in_progress":
        return "default" as const;
      case "blocked":
        return "destructive" as const;
      case "paused":
        return "outline" as const;
      case "done":
        return "default" as const;
      default:
        return "secondary" as const;
    }
  }

  function renderTaskFormFields(
    form: typeof newTask,
    setForm: (f: typeof newTask) => void,
  ) {
    return (
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Enter task title"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Enter task description"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select
            value={form.category}
            onValueChange={(value) =>
              setForm({
                ...form,
                category: value,
                course_id: value !== "class" ? "" : form.course_id,
              })
            }
          >
            <SelectTrigger id="category">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="class">Class</SelectItem>
              <SelectItem value="recruiting">Recruiting</SelectItem>
              <SelectItem value="team_research">Team Research</SelectItem>
              <SelectItem value="personal">Personal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {form.category === "class" && courses.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="course">Course</Label>
            <Select
              value={form.course_id}
              onValueChange={(value) => setForm({ ...form, course_id: value })}
            >
              <SelectTrigger id="course">
                <SelectValue placeholder="Select course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="estimated_minutes">Estimated Time (minutes)</Label>
            <Input
              id="estimated_minutes"
              type="number"
              min="1"
              value={form.estimated_minutes}
              onChange={(e) =>
                setForm({ ...form, estimated_minutes: e.target.value })
              }
              placeholder="e.g. 45"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="difficulty">Difficulty</Label>
            <Select
              value={form.difficulty}
              onValueChange={(value) => setForm({ ...form, difficulty: value })}
            >
              <SelectTrigger id="difficulty">
                <SelectValue placeholder="Select difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
                <SelectItem value="extreme">Extreme</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <Select
            value={form.priority_label}
            onValueChange={(value) =>
              setForm({ ...form, priority_label: value })
            }
          >
            <SelectTrigger id="priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="due_at">Due Date</Label>
          <Input
            id="due_at"
            type="datetime-local"
            value={form.due_at}
            onChange={(e) => setForm({ ...form, due_at: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="planned_date">Planned Date</Label>
          <Input
            id="planned_date"
            type="date"
            value={form.planned_date}
            onChange={(e) => setForm({ ...form, planned_date: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="planned_start_time">Start Time</Label>
            <Input
              id="planned_start_time"
              type="time"
              value={form.planned_start_time}
              onChange={(e) => {
                const updated = {
                  ...form,
                  planned_start_time: e.target.value,
                };
                if (updated.planned_start_time && updated.planned_end_time) {
                  const mins = computeMinutesFromTimeRange(
                    updated.planned_start_time,
                    updated.planned_end_time,
                  );
                  if (mins > 0) updated.estimated_minutes = String(mins);
                }
                setForm(updated);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="planned_end_time">End Time</Label>
            <Input
              id="planned_end_time"
              type="time"
              value={form.planned_end_time}
              onChange={(e) => {
                const updated = { ...form, planned_end_time: e.target.value };
                if (updated.planned_start_time && updated.planned_end_time) {
                  const mins = computeMinutesFromTimeRange(
                    updated.planned_start_time,
                    updated.planned_end_time,
                  );
                  if (mins > 0) updated.estimated_minutes = String(mins);
                }
                setForm(updated);
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading today's tasks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive mb-2">Error loading tasks</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={fetchTasks} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Today's Tasks</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>New Task</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>
                Add a new task to today's schedule
              </DialogDescription>
            </DialogHeader>
            {renderTaskFormFields(newTask, setNewTask)}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTask}>Create Task</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Task Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>
              Update task details. All changes are logged.
            </DialogDescription>
          </DialogHeader>
          {renderTaskFormFields(editForm, setEditForm)}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleEditTask}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {tasks.length === 0 ? (
        <div className="flex items-center justify-center h-64 border border-dashed rounded-lg">
          <div className="text-center">
            <p className="text-muted-foreground mb-2">
              No tasks scheduled for today
            </p>
            <p className="text-sm text-muted-foreground">
              Create a new task or plan tasks from your inbox
            </p>
          </div>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Est. Time</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Planned Start</TableHead>
                <TableHead>Planned End</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.title}</TableCell>
                  <TableCell>
                    {task.category ? (
                      <Badge variant="outline">{task.category}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {getCourseName(task.course_id) ? (
                      <Badge variant="outline">
                        {getCourseName(task.course_id)}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {formatMinutes(task.estimated_minutes)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {task.difficulty ? (
                      <Badge variant="outline">{task.difficulty}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStateBadgeVariant(task.state)}>
                      {task.state === "paused" ? "⏸ paused" : task.state}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDateTime(task.planned_start_at)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDateTime(task.planned_end_at)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {task.due_at ? (
                      <span
                        className={
                          task.is_overdue ? "text-red-600 font-medium" : ""
                        }
                      >
                        {format(new Date(task.due_at), "MMM d, yyyy")}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={getRiskScoreColor(task.risk_score)}>
                      {task.risk_score}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {/* Edit button */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(task)}
                        title="Edit this task's details, dates, and category"
                      >
                        ✏️ Edit
                      </Button>
                      {/* Start button */}
                      {task.state !== "in_progress" &&
                        task.state !== "done" &&
                        task.state !== "blocked" &&
                        task.state !== "paused" && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() =>
                              handleStateTransition(task.id, "in_progress")
                            }
                            title="Start working on this task"
                          >
                            ▶ Start
                          </Button>
                        )}
                      {/* Resume button for blocked/paused tasks */}
                      {(task.state === "blocked" ||
                        task.state === "paused") && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() =>
                            handleStateTransition(task.id, "in_progress")
                          }
                          title="Resume this task and continue working on it"
                        >
                          🔄 Resume
                        </Button>
                      )}
                      {/* Done button */}
                      {task.state !== "done" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStateTransition(task.id, "done")}
                          title="Mark this task as completed"
                        >
                          ✅ Done
                        </Button>
                      )}
                      {/* Pause button - you stopped working voluntarily */}
                      {task.state === "in_progress" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleStateTransition(task.id, "paused")
                          }
                          title="Pause this task — you stopped working but can resume later"
                        >
                          ⏸ Pause
                        </Button>
                      )}
                      {/* Block button - unable to continue */}
                      {task.state !== "blocked" &&
                        task.state !== "paused" &&
                        task.state !== "done" && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              handleStateTransition(task.id, "blocked")
                            }
                            title="Block this task — you are unable to continue due to a dependency or issue"
                          >
                            ⛔ Block
                          </Button>
                        )}
                      {/* Drop button */}
                      {task.state !== "dropped" && task.state !== "done" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            handleStateTransition(task.id, "dropped")
                          }
                          title="Drop this task — remove it from your plan"
                        >
                          🗑 Drop
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
