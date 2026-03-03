import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { taskService } from "@/services/TaskService";
import type { TaskEnriched, Course } from "@/types/models";
import { format } from "date-fns";
import { RefreshCw } from "lucide-react";
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

export function DueSoonView() {
  const [tasks, setTasks] = useState<TaskEnriched[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskEnriched | null>(null);
  const [editForm, setEditForm] = useState({ ...EMPTY_TASK_FORM });
  const { toast } = useToast();

  const fetchCourses = async () => {
    try {
      const { data } = await supabase
        .from("courses")
        .select("*")
        .order("name", { ascending: true });
      setCourses(data || []);
    } catch (err) {
      console.error("Error fetching courses:", err);
    }
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from("tasks_enriched")
        .select("*")
        .not("state", "in", '("done","dropped")')
        .lte("days_until_due", 7)
        .order("due_at", { ascending: true });

      if (queryError) throw queryError;

      setTasks(data || []);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch tasks";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchCourses();
  }, []);

  const handleStateTransition = async (
    taskId: string,
    newState: "in_progress" | "done" | "blocked" | "paused" | "planned",
  ) => {
    try {
      await taskService.transitionState(taskId, newState);
      const labels: Record<string, string> = {
        in_progress: "started",
        done: "completed",
        blocked: "blocked",
        paused: "paused",
        planned: "resumed",
      };
      toast({
        title: `Task ${labels[newState] || "updated"}`,
        description: `Task moved to ${newState.replace("_", " ")}`,
      });
      await fetchTasks();
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to update task",
        variant: "destructive",
      });
    }
  };

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
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    }
  }

  function renderEditFormFields() {
    return (
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label>Title *</Label>
          <Input
            value={editForm.title}
            onChange={(e) =>
              setEditForm({ ...editForm, title: e.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            value={editForm.description}
            onChange={(e) =>
              setEditForm({ ...editForm, description: e.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Select
            value={editForm.category}
            onValueChange={(value) =>
              setEditForm({
                ...editForm,
                category: value,
                course_id: value !== "class" ? "" : editForm.course_id,
              })
            }
          >
            <SelectTrigger>
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
        {editForm.category === "class" && courses.length > 0 && (
          <div className="space-y-2">
            <Label>Course</Label>
            <Select
              value={editForm.course_id}
              onValueChange={(value) =>
                setEditForm({ ...editForm, course_id: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Estimated Time (minutes)</Label>
            <Input
              type="number"
              min="1"
              value={editForm.estimated_minutes}
              onChange={(e) =>
                setEditForm({ ...editForm, estimated_minutes: e.target.value })
              }
              placeholder="e.g. 45"
            />
          </div>
          <div className="space-y-2">
            <Label>Difficulty</Label>
            <Select
              value={editForm.difficulty}
              onValueChange={(value) =>
                setEditForm({ ...editForm, difficulty: value })
              }
            >
              <SelectTrigger>
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
          <Label>Priority</Label>
          <Select
            value={editForm.priority_label}
            onValueChange={(value) =>
              setEditForm({ ...editForm, priority_label: value })
            }
          >
            <SelectTrigger>
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
          <Label>Due Date</Label>
          <Input
            type="datetime-local"
            value={editForm.due_at}
            onChange={(e) =>
              setEditForm({ ...editForm, due_at: e.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label>Planned Date</Label>
          <Input
            type="date"
            value={editForm.planned_date}
            onChange={(e) =>
              setEditForm({ ...editForm, planned_date: e.target.value })
            }
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Start Time</Label>
            <Input
              type="time"
              value={editForm.planned_start_time}
              onChange={(e) => {
                const updated = {
                  ...editForm,
                  planned_start_time: e.target.value,
                };
                if (updated.planned_start_time && updated.planned_end_time) {
                  const mins = computeMinutesFromTimeRange(
                    updated.planned_start_time,
                    updated.planned_end_time,
                  );
                  if (mins > 0) updated.estimated_minutes = String(mins);
                }
                setEditForm(updated);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>End Time</Label>
            <Input
              type="time"
              value={editForm.planned_end_time}
              onChange={(e) => {
                const updated = {
                  ...editForm,
                  planned_end_time: e.target.value,
                };
                if (updated.planned_start_time && updated.planned_end_time) {
                  const mins = computeMinutesFromTimeRange(
                    updated.planned_start_time,
                    updated.planned_end_time,
                  );
                  if (mins > 0) updated.estimated_minutes = String(mins);
                }
                setEditForm(updated);
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  const getRiskScoreBadge = (score: number) => {
    if (score >= 75) {
      return <Badge className="bg-red-500">{score}</Badge>;
    } else if (score >= 50) {
      return <Badge className="bg-orange-500">{score}</Badge>;
    } else if (score >= 25) {
      return <Badge className="bg-yellow-500">{score}</Badge>;
    } else {
      return <Badge className="bg-green-500">{score}</Badge>;
    }
  };

  const getStateBadge = (state: string) => {
    const variants: Record<string, string> = {
      backlog: "bg-gray-500",
      planned: "bg-blue-500",
      in_progress: "bg-purple-500",
      blocked: "bg-red-500",
      paused: "bg-yellow-600",
    };

    return (
      <Badge className={variants[state] || "bg-gray-500"}>
        {state === "paused" ? "⏸ paused" : state.replace("_", " ")}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading tasks due soon...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-destructive">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Due Soon</h2>
          <p className="text-muted-foreground">
            Tasks due within 7 days ({tasks.length}{" "}
            {tasks.length === 1 ? "task" : "tasks"})
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchTasks}
          disabled={loading}
          title="Refresh the list of tasks due soon"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
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
          {renderEditFormFields()}
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
        <div className="flex items-center justify-center p-8 border border-dashed rounded-lg">
          <div className="text-center text-muted-foreground">
            No tasks due within the next 7 days
          </div>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Days Until</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Risk Score</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow
                  key={task.id}
                  className={
                    task.is_overdue ? "bg-red-50 dark:bg-red-950/20" : ""
                  }
                >
                  <TableCell className="font-medium">
                    {task.title}
                    {task.is_overdue && (
                      <Badge variant="destructive" className="ml-2">
                        OVERDUE
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {task.category ? (
                      <Badge variant="outline">{task.category}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {task.due_at ? (
                      <span
                        className={
                          task.is_overdue ? "text-red-600 font-semibold" : ""
                        }
                      >
                        {format(new Date(task.due_at), "MMM d, yyyy HH:mm")}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {task.days_until_due !== null ? (
                      <span
                        className={
                          task.days_until_due < 0
                            ? "text-red-600 font-semibold"
                            : ""
                        }
                      >
                        {task.days_until_due < 0
                          ? `${Math.abs(task.days_until_due)} days ago`
                          : `${task.days_until_due} days`}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>{getStateBadge(task.state)}</TableCell>
                  <TableCell>{getRiskScoreBadge(task.risk_score)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(task)}
                        title="Edit this task's details, dates, and category"
                      >
                        ✏️ Edit
                      </Button>
                      {/* Resume for blocked/paused */}
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
                      {/* Start for non-active */}
                      {task.state !== "in_progress" &&
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
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStateTransition(task.id, "done")}
                        title="Mark this task as completed"
                      >
                        ✅ Done
                      </Button>
                      {/* Pause for in_progress */}
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
                      {task.state !== "blocked" && task.state !== "paused" && (
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
