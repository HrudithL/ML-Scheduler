import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { taskService } from "@/services/TaskService";
import type { Task } from "@/types/models";
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
import { useToast } from "@/hooks/use-toast";

// Extended type to include risk_score from enriched view
interface TaskWithRisk extends Task {
  risk_score: number;
}

export function BlockedView() {
  const [tasks, setTasks] = useState<TaskWithRisk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);

      // Query from tasks_enriched to get both blocked and paused tasks
      const { data, error: queryError } = await supabase
        .from("tasks_enriched")
        .select("*")
        .in("state", ["blocked", "paused"])
        .order("risk_score", { ascending: false });

      if (queryError) throw queryError;

      setTasks((data as TaskWithRisk[]) || []);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to fetch blocked/paused tasks";
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
  }, []);

  const handleResume = async (taskId: string) => {
    try {
      await taskService.transitionState(taskId, "in_progress");
      toast({
        title: "Task resumed",
        description: "Task moved back to in progress",
      });
      await fetchTasks();
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to resume task",
        variant: "destructive",
      });
    }
  };

  const handleDrop = async (taskId: string) => {
    try {
      await taskService.transitionState(taskId, "dropped");
      toast({
        title: "Task dropped",
        description: "Task has been dropped",
      });
      await fetchTasks();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to drop task",
        variant: "destructive",
      });
    }
  };

  const handleDone = async (taskId: string) => {
    try {
      await taskService.transitionState(taskId, "done", new Date());
      toast({
        title: "Task completed",
        description: "Task marked as done",
      });
      await fetchTasks();
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to complete task",
        variant: "destructive",
      });
    }
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">
          Loading blocked & paused tasks...
        </div>
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
          <h2 className="text-2xl font-bold">Blocked & Paused Tasks</h2>
          <p className="text-muted-foreground">
            {tasks.length} {tasks.length === 1 ? "task" : "tasks"} currently
            blocked or paused
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchTasks}
          disabled={loading}
          title="Refresh the list of blocked and paused tasks"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {tasks.length === 0 ? (
        <div className="flex items-center justify-center p-8 border border-dashed rounded-lg">
          <div className="text-center text-muted-foreground">
            No blocked or paused tasks — great job keeping things moving!
          </div>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Since</TableHead>
                <TableHead>Risk Score</TableHead>
                <TableHead className="text-right">Actions</TableHead>
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
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        task.state === "blocked" ? "destructive" : "outline"
                      }
                    >
                      {task.state === "paused" ? "⏸ Paused" : "⛔ Blocked"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {task.due_at ? (
                      format(new Date(task.due_at), "MMM d, yyyy HH:mm")
                    ) : (
                      <span className="text-muted-foreground">No due date</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {format(new Date(task.updated_at), "MMM d, yyyy HH:mm")}
                  </TableCell>
                  <TableCell>{getRiskScoreBadge(task.risk_score)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleResume(task.id)}
                        title="Resume this task — move it back to in progress"
                      >
                        🔄 Resume
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDone(task.id)}
                        title="Mark this task as completed"
                      >
                        ✅ Done
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDrop(task.id)}
                        title="Drop this task — remove it from your plan"
                      >
                        🗑 Drop
                      </Button>
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
