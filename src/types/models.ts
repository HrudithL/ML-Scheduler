import type { Database } from "./database";

export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];
export type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];

export type TaskEvent = Database["public"]["Tables"]["task_events"]["Row"];
export type TaskEventInsert =
  Database["public"]["Tables"]["task_events"]["Insert"];

export type Course = Database["public"]["Tables"]["courses"]["Row"];
export type CourseInsert = Database["public"]["Tables"]["courses"]["Insert"];
export type CourseUpdate = Database["public"]["Tables"]["courses"]["Update"];

export type DailyLog = Database["public"]["Tables"]["daily_logs"]["Row"];
export type DailyLogInsert =
  Database["public"]["Tables"]["daily_logs"]["Insert"];
export type DailyLogUpdate =
  Database["public"]["Tables"]["daily_logs"]["Update"];

export type TaskEnriched = Database["public"]["Views"]["tasks_enriched"]["Row"];

export type TaskState = Task["state"];
export type TaskCategory = NonNullable<Task["category"]>;
export type TaskType = NonNullable<Task["task_type"]>;
export type PriorityLabel = NonNullable<Task["priority_label"]>;
export type Importance = NonNullable<Task["importance"]>;
export type Difficulty = NonNullable<Task["difficulty"]>;
