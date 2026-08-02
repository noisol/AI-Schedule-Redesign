// frontend/src/data/mockdata.tsx

import { ScheduleEvent } from "../types";

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
    date: getDateKey(0),
    startTime: "08:00",
    endTime: "09:30",
    durationMinutes: 90,
    priority: "high",
    status: "scheduled",
    memo: "아침 유산소"
  },
  {
    id: "event-002",
    title: "팀 주간 회의",
    date: getDateKey(1),
    startTime: "10:00",
    endTime: "11:30",
    durationMinutes: 90,
    priority: "high",
    status: "scheduled",
    memo: "주간 진행 상황 공유"
  },
  {
    id: "event-003",
    title: "캡스톤 멘토링",
    date: getDateKey(3),
    startTime: "14:00",
    endTime: "16:00",
    durationMinutes: 120,
    priority: "fixed",
    status: "scheduled",
    memo: "중간 점검 발표"
  }
];