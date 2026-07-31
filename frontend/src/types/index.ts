export type Priority = "low" | "medium" | "high" | "fixed";

export type ScheduleStatus =
  | "scheduled"
  | "completed"
  | "postponed"
  | "cancelled";

export interface ScheduleEvent {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes?: number;
  priority: Priority;
  canSplit?: boolean;
  deadline?: string | null;
  minimumDurationMinutes?: number | null;
  status: ScheduleStatus;
  memo: string | null;
}