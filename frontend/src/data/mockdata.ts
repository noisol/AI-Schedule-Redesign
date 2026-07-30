// frontend/src/data/mockdata.tsx

import { ScheduleEvent } from "../types";

export const mockSchedules: ScheduleEvent[] = [
  {
    id: "event-001",
    title: "운동",
    date: "2026-07-27", // 월요일
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
    date: "2026-07-28", // 화요일
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
    date: "2026-07-31", // 금요일 (오늘)
    startTime: "14:00",
    endTime: "16:00",
    durationMinutes: 120,
    priority: "fixed",
    status: "scheduled",
    memo: "중간 점검 발표"
  }
];