import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TaskEnriched {
  id: string;
  title: string;
  category: string | null;
  completed_at: string | null;
  due_at: string | null;
  on_time: boolean;
  cycle_time_hours: number | null;
  lateness_hours: number | null;
}

interface CompletionStats {
  totalCompleted: number;
  avgCycleTime: number;
  onTimePercentage: number;
}

export function CompletedView() {
  const [tasks, setTasks] = useState<TaskEnriched[]>([]);
  const [stats, setStats] = useState<CompletionStats>({
    totalCompleted: 0,
    avgCycleTime: 0,
    onTimePercentage: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCompletedTasks();
  }, []);

  const fetchCompletedTasks = async () => {
    try {
      setLoading(true);
      setError(null);

      // Calculate date 14 days ago
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const { data, error: fetchError } = await supabase
        .from('tasks_enriched')
        .select('id, title, category, completed_at, due_at, on_time, cycle_time_hours, lateness_hours')
        .eq('state', 'done')
        .gte('completed_at', fourteenDaysAgo.toISOString())
        .order('completed_at', { ascending: false });

      if (fetchError) throw fetchError;

      const completedTasks = (data || []) as TaskEnriched[];
      setTasks(completedTasks);

      // Calculate stats
      const totalCompleted = completedTasks.length;
      const tasksWithCycleTime = completedTasks.filter(t => t.cycle_time_hours !== null);
      const avgCycleTime = tasksWithCycleTime.length > 0
        ? tasksWithCycleTime.reduce((sum, t) => sum + (t.cycle_time_hours || 0), 0) / tasksWithCycleTime.length
        : 0;
      
      const tasksWithOnTimeData = completedTasks.filter(t => t.due_at !== null);
      const onTimeCount = tasksWithOnTimeData.filter(t => t.on_time).length;
      const onTimePercentage = tasksWithOnTimeData.length > 0
        ? (onTimeCount / tasksWithOnTimeData.length) * 100
        : 0;

      setStats({
        totalCompleted,
        avgCycleTime,
        onTimePercentage,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch completed tasks');
      console.error('Error fetching completed tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading completed tasks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Completed Tasks</h1>
        <p className="text-muted-foreground mt-1">Tasks completed in the last 14 days</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCompleted}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Cycle Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgCycleTime.toFixed(1)}h</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">On-Time Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.onTimePercentage.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks Table */}
      {tasks.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">No completed tasks in the last 14 days</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>On Time</TableHead>
                  <TableHead className="text-right">Cycle Time</TableHead>
                  <TableHead className="text-right">Lateness</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.title}</TableCell>
                    <TableCell>
                      {task.category ? (
                        <Badge variant="outline" className="capitalize">
                          {task.category.replace('_', ' ')}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {task.completed_at
                        ? format(new Date(task.completed_at), 'MMM d, yyyy h:mm a')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {task.due_at
                        ? format(new Date(task.due_at), 'MMM d, yyyy h:mm a')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {task.due_at ? (
                        <Badge variant={task.on_time ? 'default' : 'destructive'}>
                          {task.on_time ? 'On Time' : 'Late'}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {task.cycle_time_hours !== null
                        ? `${task.cycle_time_hours.toFixed(1)}h`
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {task.lateness_hours !== null
                        ? `${task.lateness_hours > 0 ? '+' : ''}${task.lateness_hours.toFixed(1)}h`
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
