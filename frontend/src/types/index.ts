export type Priority = "low" | "medium" | "high" | "fixed";

export interface ScheduleEvent {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  priority: Priority;
}
