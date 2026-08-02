import type { ScheduleEvent } from "../types";

const KEYS = {
  schedules: "ai-day-rescheduler:schedules",
  draft: "ai-day-rescheduler:draft-input",
  lastResult: "ai-day-rescheduler:last-result",
  sleep: "ai-day-rescheduler:sleep-preference",
  weekStart: "ai-day-rescheduler:week-start",
} as const;

export interface RescheduleOption {
  id: number;
  title: string;
  summary: string;
  originalEvents?: ScheduleEvent[];
  rescheduledEvents: ScheduleEvent[];
  changes: Array<{ eventId: string; action: string; reason: string }>;
}

const canUseStorage = () => typeof window !== "undefined";

export function getLocalStorage<T>(key: string): T | null {
  if (!canUseStorage()) return null;
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) as T : null;
  } catch {
    return null;
  }
}

export function setLocalStorage<T>(key: string, value: T) {
  if (canUseStorage()) window.localStorage.setItem(key, JSON.stringify(value));
}

export const loadSchedules = (fallback: ScheduleEvent[]) => getLocalStorage<ScheduleEvent[]>(KEYS.schedules) ?? fallback;
export const saveSchedules = (value: ScheduleEvent[]) => setLocalStorage(KEYS.schedules, value);
export const loadDraftInput = (fallback: string) => getLocalStorage<string>(KEYS.draft) ?? fallback;
export const saveDraftInput = (value: string) => setLocalStorage(KEYS.draft, value);
export const loadLastResult = () => getLocalStorage<RescheduleOption>(KEYS.lastResult);
export const saveLastResult = (value: RescheduleOption) => setLocalStorage(KEYS.lastResult, value);
export const clearLastResult = () => {
  if (canUseStorage()) window.localStorage.removeItem(KEYS.lastResult);
};
export const loadWeekStart = () => getLocalStorage<string>(KEYS.weekStart);
export const saveWeekStart = (value: Date) => setLocalStorage(KEYS.weekStart, value.toISOString());
export const loadSleepPreference = () => getLocalStorage<{ bedtime: string; wakeTime: string }>(KEYS.sleep) ?? { bedtime: "00:00", wakeTime: "07:00" };
export const saveSleepPreference = (value: { bedtime: string; wakeTime: string }) => setLocalStorage(KEYS.sleep, value);
