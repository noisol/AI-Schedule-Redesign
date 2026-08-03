// frontend/src/data/mockdata.tsx

import { ScheduleEvent } from "../types";
import { combineDateAndTime } from "../lib/datetime";

const today = new Date();
const getDateKey = (offsetDays: number) => {
  const date = new Date(today);
  date.setHours(0, 0, 0, 0);
  date.setDate(today.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const mockSchedules: ScheduleEvent[] = [
  {
    id: "event-001",
    title: "운동",
    startAt: combineDateAndTime(getDateKey(0), "08:00"),
    endAt: combineDateAndTime(getDateKey(0), "09:30"),
    priority: "high"
  },
  {
    id: "event-002",
    title: "팀 주간 회의",
    startAt: combineDateAndTime(getDateKey(1), "10:00"),
    endAt: combineDateAndTime(getDateKey(1), "11:30"),
    priority: "high"
  },
  {
    id: "event-003",
    title: "캡스톤 멘토링",
    startAt: combineDateAndTime(getDateKey(3), "14:00"),
    endAt: combineDateAndTime(getDateKey(3), "16:00"),
    priority: "fixed"
  }
];
