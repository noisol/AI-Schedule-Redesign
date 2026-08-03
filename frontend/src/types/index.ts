export type Priority = "low" | "medium" | "high" | "fixed";

export interface ScheduleEvent {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  priority: Priority;
}
