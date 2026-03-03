export const TASK_STATES = [
  { value: "backlog", label: "Backlog" },
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In Progress" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
  { value: "dropped", label: "Dropped" },
] as const;

export const CATEGORIES = [
  { value: "class", label: "Class" },
  { value: "recruiting", label: "Recruiting" },
  { value: "team_research", label: "Team Research" },
  { value: "personal", label: "Personal" },
] as const;

export const TASK_TYPES = [
  { value: "coding", label: "Coding" },
  { value: "study_reading", label: "Study/Reading" },
  { value: "writing_report", label: "Writing/Report" },
  { value: "admin_logistics", label: "Admin/Logistics" },
  { value: "interview_prep", label: "Interview Prep" },
] as const;

export const PRIORITY_LABELS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
] as const;

export const IMPORTANCE_LEVELS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
] as const;

export const DIFFICULTY_LEVELS = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
  { value: "extreme", label: "Extreme" },
] as const;

export const DAYS_OF_WEEK = [
  { value: "mon", label: "Monday" },
  { value: "tue", label: "Tuesday" },
  { value: "wed", label: "Wednesday" },
  { value: "thu", label: "Thursday" },
  { value: "fri", label: "Friday" },
  { value: "sat", label: "Saturday" },
  { value: "sun", label: "Sunday" },
] as const;
