import { useEffect, useState, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin, { Draggable } from "@fullcalendar/interaction";
import type { EventDropArg, EventClickArg, DateSelectArg } from "@fullcalendar/core";
import { format, addMinutes } from "date-fns";
import { supabase } from "@/lib/supabase";
import { taskService } from "@/services/TaskService";
import { googleCalendarService } from "@/services/GoogleCalendarService";
import type { CalendarEvent, SyncFromGoogleResult } from "@/services/GoogleCalendarService";
import type { TaskEnriched, Course } from "@/types/models";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar as CalendarIcon,
  RefreshCw,
  GripVertical,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  Link2,
  Unlink,
  Search,
  Zap,
  ZapOff,
} from "lucide-react";

// Priority colors for task events on calendar
const PRIORITY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  critical: { bg: "#fecaca", border: "#ef4444", text: "#991b1b" },
  high: { bg: "#fed7aa", border: "#f97316", text: "#9a3412" },
  medium: { bg: "#fef08a", border: "#eab308", text: "#854d0e" },
  low: { bg: "#bbf7d0", border: "#22c55e", text: "#166534" },
};

export function CalendarView() {
  const [tasks, setTasks] = useState<TaskEnriched[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [googleEvents, setGoogleEvents] = useState<CalendarEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncConflicts, setSyncConflicts] = useState<Array<any>>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [calendarDateRange, setCalendarDateRange] = useState<{ start: Date; end: Date } | null>(null);

  const calendarRef = useRef<FullCalendar>(null);
  const taskListRef = useRef<HTMLDivElement>(null);
  const draggableInitialized = useRef(false);
  const { toast } = useToast();

  // Fetch everything on mount
  useEffect(() => {
    loadAll();
  }, []);

  // Re-init draggable whenever tasks change
  useEffect(() => {
    initDraggable();
  }, [tasks, searchQuery]);

  // Fetch Google events when date range changes
  useEffect(() => {
    if (calendarDateRange && isConnected) {
      fetchGoogleEvents(calendarDateRange.start, calendarDateRange.end);
    }
  }, [calendarDateRange, isConnected]);

  // Automatic 2-way sync polling (every 30 seconds when connected and enabled)
  useEffect(() => {
    if (!isConnected || !autoSyncEnabled) return;

    const syncInterval = setInterval(async () => {
      await performAutoSync();
    }, 30000); // 30 seconds

    // Also do an initial sync after 2 seconds
    const initialSync = setTimeout(() => {
      performAutoSync();
    }, 2000);

    return () => {
      clearInterval(syncInterval);
      clearTimeout(initialSync);
    };
  }, [isConnected, autoSyncEnabled]);

  async function loadAll() {
    setLoading(true);
    try {
      await Promise.all([fetchTasks(), fetchCourses(), checkGoogleConnection()]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTasks() {
    const { data, error } = await supabase
      .from("tasks_enriched")
      .select("*")
      .not("state", "eq", "dropped")
      .order("due_at", { ascending: true, nullsFirst: false });

    if (error) {
      console.error("Error fetching tasks:", error);
      toast({ title: "Error", description: "Failed to load tasks", variant: "destructive" });
      return;
    }
    setTasks((data as TaskEnriched[]) ?? []);
  }

  async function fetchCourses() {
    const { data } = await supabase.from("courses").select("*").order("name");
    setCourses((data as Course[]) ?? []);
  }

  async function checkGoogleConnection() {
    try {
      const connected = await googleCalendarService.isConnected();
      setIsConnected(connected);
    } catch {
      setIsConnected(false);
    }
  }

  async function fetchGoogleEvents(start: Date, end: Date) {
    if (!isConnected) return;
    try {
      const events = await googleCalendarService.fetchCalendarEvents(
        start.toISOString(),
        end.toISOString(),
      );
      setGoogleEvents(events);
    } catch (err) {
      console.error("Failed to fetch Google Calendar events:", err);
    }
  }

  /**
   * Perform automatic 2-way sync from Google Calendar
   */
  async function performAutoSync() {
    if (syncing) return; // Skip if already syncing

    try {
      const result = await googleCalendarService.syncFromGoogle();
      
      if (result.success) {
        setLastSyncTime(new Date());

        // Apply updates from Google to local tasks
        if (result.updatedTasks.length > 0) {
          await applyGoogleUpdates(result.updatedTasks);
          
          // Show toast only if there were actual changes
          if (result.updatedTasks.length > 0) {
            toast({
              title: "Synced from Google",
              description: `Updated ${result.updatedTasks.length} task${result.updatedTasks.length > 1 ? "s" : ""} from Google Calendar`,
            });
          }
        }

        // Handle conflicts
        if (result.conflicts && result.conflicts.length > 0) {
          setSyncConflicts(result.conflicts);
          toast({
            title: "Sync conflicts detected",
            description: `${result.conflicts.length} conflict${result.conflicts.length > 1 ? "s" : ""} found. Google changes were applied.`,
            variant: "destructive",
          });
        }

        // Refresh tasks to show updates
        await fetchTasks();

        // Refresh Google events
        if (calendarDateRange) {
          await fetchGoogleEvents(calendarDateRange.start, calendarDateRange.end);
        }
      }
    } catch (err) {
      console.error("Auto-sync error:", err);
      // Silent failure for auto-sync - don't spam user with errors
    }
  }

  /**
   * Apply updates from Google Calendar to local tasks
   */
  async function applyGoogleUpdates(updates: SyncFromGoogleResult["updatedTasks"]) {
    for (const update of updates) {
      try {
        const task = tasks.find(t => t.id === update.taskId);
        if (!task) continue;

        // Check if there are actual changes to prevent unnecessary updates
        const hasChanges = 
          (update.changes.planned_start_at && update.changes.planned_start_at !== task.planned_start_at) ||
          (update.changes.planned_end_at && update.changes.planned_end_at !== task.planned_end_at) ||
          (update.changes.title && update.changes.title !== task.title) ||
          (update.changes.description && update.changes.description !== task.description);

        if (!hasChanges) continue;

        // Apply the changes
        const patchData: any = {};
        
        if (update.changes.planned_start_at || update.changes.planned_end_at) {
          // Update planned block if time changed
          await taskService.updatePlannedBlock(
            update.taskId,
            update.changes.planned_start_at ? new Date(update.changes.planned_start_at) : null,
            update.changes.planned_end_at ? new Date(update.changes.planned_end_at) : null,
          );
        }

        if (update.changes.title) patchData.title = update.changes.title;
        if (update.changes.description !== undefined) patchData.description = update.changes.description;

        if (Object.keys(patchData).length > 0) {
          await taskService.updateTask(update.taskId, patchData);
        }
      } catch (err) {
        console.error(`Failed to apply update for task ${update.taskId}:`, err);
      }
    }
  }

  /**
   * Initialize the FullCalendar Draggable on the task list container
   */
  function initDraggable() {
    if (!taskListRef.current) return;

    // Destroy previous draggable if exists
    if (draggableInitialized.current) {
      // FullCalendar handles cleanup internally
    }

    new Draggable(taskListRef.current, {
      itemSelector: ".draggable-task",
      eventData: (eventEl) => {
        const taskId = eventEl.getAttribute("data-task-id") ?? "";
        const title = eventEl.getAttribute("data-task-title") ?? "";
        const duration = eventEl.getAttribute("data-task-duration") ?? "01:00";
        const priority = eventEl.getAttribute("data-task-priority") ?? "medium";
        const colors = PRIORITY_COLORS[priority] || PRIORITY_COLORS.medium;

        return {
          id: `task-${taskId}`,
          title,
          duration,
          backgroundColor: colors.bg,
          borderColor: colors.border,
          textColor: colors.text,
          extendedProps: { taskId, isLocalTask: true },
        };
      },
    });
    draggableInitialized.current = true;
  }

  /**
   * Handle when an external task is dropped onto the calendar
   */
  async function handleEventReceive(info: any) {
    const taskId = info.event.extendedProps?.taskId;
    if (!taskId) return;

    const start = info.event.start;
    const end = info.event.end || addMinutes(start, 60);

    try {
      // Update the task with planned dates
      await taskService.updatePlannedBlock(taskId, start, end);

      // Also set the due date if not already set
      const task = tasks.find((t) => t.id === taskId);
      if (task && !task.due_at) {
        await taskService.updateDueDate(taskId, end);
      }

      // Sync to Google Calendar with reminders
      if (isConnected) {
        const dueAt = task?.due_at || end.toISOString();
        await googleCalendarService.syncTaskWithReminders(
          taskId,
          start.toISOString(),
          end.toISOString(),
          dueAt,
        );
      }

      // If task is in backlog, move to planned
      if (task?.state === "backlog") {
        await taskService.transitionState(taskId, "planned");
      }

      toast({ title: "Task scheduled", description: `"${info.event.title}" added to calendar` });

      // Refresh tasks
      await fetchTasks();

      // Refresh Google events
      if (calendarDateRange && isConnected) {
        await fetchGoogleEvents(calendarDateRange.start, calendarDateRange.end);
      }
    } catch (err) {
      console.error("Error scheduling task:", err);
      toast({ title: "Error", description: "Failed to schedule task", variant: "destructive" });
      info.revert();
    }
  }

  /**
   * Handle when a calendar event is dragged to a new time
   */
  async function handleEventDrop(info: EventDropArg) {
    const taskId = info.event.extendedProps?.taskId;
    if (!taskId) return; // Not a local task, ignore

    const start = info.event.start;
    const end = info.event.end || addMinutes(start!, 60);

    try {
      await taskService.updatePlannedBlock(taskId, start, end);

      // Sync to Google Calendar with reminders
      if (isConnected) {
        const task = tasks.find((t) => t.id === taskId);
        const dueAt = task?.due_at || end!.toISOString();
        await googleCalendarService.syncTaskWithReminders(
          taskId,
          start!.toISOString(),
          end!.toISOString(),
          dueAt,
        );
      }

      toast({ title: "Task rescheduled" });
      await fetchTasks();
    } catch (err) {
      console.error("Error rescheduling task:", err);
      toast({ title: "Error", description: "Failed to reschedule task", variant: "destructive" });
      info.revert();
    }
  }

  /**
   * Handle resizing an existing event
   */
  async function handleEventResize(info: any) {
    const taskId = info.event.extendedProps?.taskId;
    if (!taskId) return;

    const start = info.event.start;
    const end = info.event.end || addMinutes(start!, 60);

    try {
      await taskService.updatePlannedBlock(taskId, start, end);

      if (isConnected) {
        const task = tasks.find((t) => t.id === taskId);
        const dueAt = task?.due_at || end!.toISOString();
        await googleCalendarService.syncTaskWithReminders(
          taskId,
          start!.toISOString(),
          end!.toISOString(),
          dueAt,
        );
      }

      toast({ title: "Task duration updated" });
      await fetchTasks();
    } catch (err) {
      console.error("Error resizing task:", err);
      info.revert();
    }
  }

  /**
   * Handle clicking a calendar event
   */
  function handleEventClick(info: EventClickArg) {
    const event = info.event;

    // If it's a Google Calendar event, open in Google Calendar
    if (event.extendedProps?.isGoogleEvent && event.extendedProps?.htmlLink) {
      window.open(event.extendedProps.htmlLink, "_blank");
      return;
    }

    // For local tasks, you could open an edit dialog - for now show a toast
    const taskId = event.extendedProps?.taskId;
    if (taskId) {
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        toast({
          title: task.title,
          description: `State: ${task.state} | Due: ${task.due_at ? format(new Date(task.due_at), "MMM d, h:mm a") : "Not set"}`,
        });
      }
    }
  }

  /**
   * Handle a date/time selection on the calendar (create a quick task)
   */
  async function handleDateSelect(selectInfo: DateSelectArg) {
    // For now just deselect - the drag-and-drop is the primary interaction
    selectInfo.view.calendar.unselect();
  }

  /**
   * Mark a task as completed - removes from Google Tasks
   */
  async function handleCompleteTask(taskId: string) {
    try {
      await taskService.transitionState(taskId, "done");

      // Remove from Google Tasks (completed tasks shouldn't remain)
      if (isConnected) {
        await googleCalendarService.removeCompletedTask(taskId);
      }

      toast({ title: "Task completed", description: "Removed from Google Tasks" });
      await fetchTasks();

      // Refresh Google events to reflect changes
      if (calendarDateRange && isConnected) {
        await fetchGoogleEvents(calendarDateRange.start, calendarDateRange.end);
      }
    } catch (err) {
      console.error("Error completing task:", err);
      toast({ title: "Error", description: "Failed to complete task", variant: "destructive" });
    }
  }

  /**
   * Full sync: push all tasks and pull Google events
   */
  async function handleFullSync() {
    if (!isConnected) {
      toast({ title: "Not connected", description: "Connect Google Calendar in Settings first", variant: "destructive" });
      return;
    }

    setSyncing(true);
    try {
      // First push all local tasks to Google
      await googleCalendarService.syncAll();
      
      // Then pull changes from Google
      const result = await googleCalendarService.syncFromGoogle();
      
      if (result.success && result.updatedTasks.length > 0) {
        await applyGoogleUpdates(result.updatedTasks);
      }

      if (result.conflicts && result.conflicts.length > 0) {
        setSyncConflicts(result.conflicts);
      }

      await fetchTasks();
      if (calendarDateRange) {
        await fetchGoogleEvents(calendarDateRange.start, calendarDateRange.end);
      }
      
      setLastSyncTime(new Date());
      toast({ 
        title: "Sync complete", 
        description: `All tasks synced with Google Calendar${result.updatedTasks.length > 0 ? ` (${result.updatedTasks.length} updated from Google)` : ""}` 
      });
    } catch (err) {
      console.error("Sync error:", err);
      toast({ title: "Sync failed", description: String(err), variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  }

  /**
   * Called when the calendar date range changes (view navigation)
   */
  function handleDatesSet(dateInfo: any) {
    setCalendarDateRange({ start: dateInfo.start, end: dateInfo.end });
  }

  /**
   * Build calendar events from tasks + Google Calendar events
   */
  function getCalendarEvents() {
    const taskEvents = tasks
      .filter((t) => t.planned_start_at && t.state !== "done" && t.state !== "dropped")
      .map((t) => {
        const priority = t.priority_label || "medium";
        const colors = PRIORITY_COLORS[priority] || PRIORITY_COLORS.medium;
        const estimatedEnd = t.planned_end_at
          ? t.planned_end_at
          : addMinutes(new Date(t.planned_start_at!), t.estimated_minutes || 60).toISOString();

        return {
          id: `task-${t.id}`,
          title: `📋 ${t.title}`,
          start: t.planned_start_at!,
          end: estimatedEnd,
          backgroundColor: colors.bg,
          borderColor: colors.border,
          textColor: colors.text,
          editable: true,
          extendedProps: {
            taskId: t.id,
            isLocalTask: true,
            state: t.state,
            priority: t.priority_label,
            dueAt: t.due_at,
          },
        };
      });

    // Google Calendar events (read-only, non-editable)
    const gEvents = googleEvents.map((e) => ({
      id: `google-${e.id}`,
      title: e.title,
      start: e.start,
      end: e.end,
      allDay: e.allDay,
      backgroundColor: "#e0e7ff",
      borderColor: "#6366f1",
      textColor: "#3730a3",
      editable: false,
      extendedProps: {
        isGoogleEvent: true,
        htmlLink: e.htmlLink,
        location: e.location,
        description: e.description,
      },
    }));

    return [...taskEvents, ...gEvents];
  }

  // Filter unscheduled tasks for the sidebar
  const unscheduledTasks = tasks.filter(
    (t) =>
      !t.planned_start_at &&
      t.state !== "done" &&
      t.state !== "dropped" &&
      t.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Also show scheduled but not done tasks in a separate section
  const scheduledTasks = tasks.filter(
    (t) =>
      t.planned_start_at &&
      t.state !== "done" &&
      t.state !== "dropped" &&
      t.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const courseMap = new Map(courses.map((c) => [c.id, c.name]));

  function getTaskDuration(task: TaskEnriched): string {
    if (task.estimated_minutes) {
      const hours = Math.floor(task.estimated_minutes / 60);
      const mins = task.estimated_minutes % 60;
      return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
    }
    return "01:00"; // default 1 hour
  }

  function formatMinutes(minutes: number | null): string {
    if (!minutes) return "1h";
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading calendar...</span>
      </div>
    );
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-12rem)]">
      {/* Task Sidebar */}
      <div className="w-80 flex-shrink-0 flex flex-col gap-3 overflow-hidden">
        {/* Sidebar Header */}
        <Card>
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                Tasks
              </CardTitle>
              <div className="flex items-center gap-1">
                {isConnected ? (
                  <Badge variant="outline" className="text-xs gap-1 text-green-600 border-green-300">
                    <Link2 className="w-3 h-3" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs gap-1 text-muted-foreground">
                    <Unlink className="w-3 h-3" />
                    Not linked
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setAutoSyncEnabled(!autoSyncEnabled)}
                  disabled={!isConnected}
                  title={autoSyncEnabled ? "Disable auto-sync" : "Enable auto-sync"}
                >
                  {autoSyncEnabled ? (
                    <Zap className="w-3.5 h-3.5 text-yellow-500" />
                  ) : (
                    <ZapOff className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleFullSync}
                  disabled={syncing || !isConnected}
                  title="Sync with Google Calendar"
                >
                  {syncing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                </Button>
              </div>
            </div>
            {lastSyncTime && isConnected && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Last synced: {format(lastSyncTime, "h:mm:ss a")}
                {autoSyncEnabled && " • Auto-sync enabled"}
              </p>
            )}
            {syncConflicts.length > 0 && (
              <div className="mt-2 text-[10px] text-amber-600 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {syncConflicts.length} conflict{syncConflicts.length > 1 ? "s" : ""} resolved (Google changes applied)
              </div>
            )}
          </CardHeader>
        </Card>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        {/* Unscheduled Tasks (Draggable) */}
        <Card className="flex-1 overflow-hidden flex flex-col">
          <CardHeader className="py-2 px-3 border-b">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Drag to schedule ({unscheduledTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 overflow-y-auto flex-1" ref={taskListRef}>
            {unscheduledTasks.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No unscheduled tasks
              </p>
            ) : (
              <div className="space-y-1.5">
                {unscheduledTasks.map((task) => (
                  <div
                    key={task.id}
                    className="draggable-task group flex items-start gap-2 p-2 rounded-md border bg-card hover:bg-accent/50 cursor-grab active:cursor-grabbing transition-colors"
                    data-task-id={task.id}
                    data-task-title={task.title}
                    data-task-duration={getTaskDuration(task)}
                    data-task-priority={task.priority_label || "medium"}
                  >
                    <GripVertical className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0 opacity-50 group-hover:opacity-100" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {task.priority_label && (
                          <Badge
                            variant={task.priority_label === "critical" ? "destructive" : "outline"}
                            className="text-[10px] px-1 py-0 h-4"
                          >
                            {task.priority_label}
                          </Badge>
                        )}
                        {task.course_id && (
                          <span className="text-[10px] text-muted-foreground">
                            {courseMap.get(task.course_id) || ""}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />
                          {formatMinutes(task.estimated_minutes)}
                        </span>
                        {task.due_at && (
                          <span
                            className={`text-[10px] flex items-center gap-0.5 ${
                            task.is_overdue ? "text-red-500" : "text-muted-foreground"
                            }`}
                          >
                            {task.is_overdue && <AlertTriangle className="w-3 h-3" />}
                            Due {format(new Date(task.due_at), "MMM d")}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCompleteTask(task.id);
                      }}
                      title="Mark complete"
                    >
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scheduled tasks count */}
        {scheduledTasks.length > 0 && (
          <Card>
            <CardContent className="py-2 px-3">
              <p className="text-xs text-muted-foreground">
                {scheduledTasks.length} task{scheduledTasks.length > 1 ? "s" : ""} on calendar
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Calendar */}
      <div className="flex-1 min-w-0 calendar-wrapper">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          height="100%"
          editable={true}
          droppable={true}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          weekends={true}
          nowIndicator={true}
          slotMinTime="06:00:00"
          slotMaxTime="24:00:00"
          slotDuration="00:30:00"
          scrollTime="08:00:00"
          events={getCalendarEvents()}
          eventReceive={handleEventReceive}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          eventClick={handleEventClick}
          select={handleDateSelect}
          datesSet={handleDatesSet}
          eventContent={renderEventContent}
        />
      </div>
    </div>
  );
}

/**
 * Custom event content renderer
 */
function renderEventContent(eventInfo: any) {
  const { event } = eventInfo;
  const isGoogle = event.extendedProps?.isGoogleEvent;
  const timeText = eventInfo.timeText;

  return (
    <div className="px-1 py-0.5 overflow-hidden h-full">
      <div className="flex items-center gap-1">
        {timeText && <span className="text-[10px] font-medium opacity-75">{timeText}</span>}
      </div>
      <p className="text-xs font-semibold truncate leading-tight">{event.title}</p>
      {isGoogle && event.extendedProps?.location && (
        <p className="text-[10px] opacity-75 truncate">{event.extendedProps.location}</p>
      )}
    </div>
  );
}
