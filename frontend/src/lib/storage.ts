import type { ScheduleEvent } from "../types";
import { combineDateAndTime, toTimeMinutes } from "./datetime";

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

const normalizeScheduleEvent = (value: unknown): ScheduleEvent | null => {
  if (!value || typeof value !== "object") return null;
  const event = value as Record<string, unknown>;
  if (typeof event.id !== "string" || typeof event.title !== "string" || typeof event.priority !== "string") return null;

  if (typeof event.startAt === "string" && typeof event.endAt === "string") {
    return {
      id: event.id,
      title: event.title,
      startAt: event.startAt,
      endAt: event.endAt,
      priority: event.priority as ScheduleEvent["priority"],
    };
  }

  if (typeof event.date !== "string" || typeof event.startTime !== "string" || typeof event.endTime !== "string") return null;
  const endDayOffset = toTimeMinutes(event.endTime) <= toTimeMinutes(event.startTime) ? 1 : 0;
  return {
    id: event.id,
    title: event.title,
    startAt: combineDateAndTime(event.date, event.startTime),
    endAt: combineDateAndTime(event.date, event.endTime, endDayOffset),
    priority: event.priority as ScheduleEvent["priority"],
  };
};

const normalizeEvents = (value: unknown) =>
  Array.isArray(value)
    ? value.map(normalizeScheduleEvent).filter((event): event is ScheduleEvent => event !== null)
    : [];

export const loadSchedules = (fallback: ScheduleEvent[]) => {
  const saved = getLocalStorage<unknown>(KEYS.schedules);
  if (saved === null) return fallback;
  const normalized = normalizeEvents(saved);
  return normalized.length > 0 ? normalized : fallback;
};
export const saveSchedules = (value: ScheduleEvent[]) => setLocalStorage(KEYS.schedules, value);
export const loadDraftInput = (fallback: string) => getLocalStorage<string>(KEYS.draft) ?? fallback;
export const saveDraftInput = (value: string) => setLocalStorage(KEYS.draft, value);
export const loadLastResult = () => {
  const saved = getLocalStorage<unknown>(KEYS.lastResult);
  if (!saved || typeof saved !== "object") return null;
  const result = saved as RescheduleOption & { originalEvents?: unknown; rescheduledEvents?: unknown };
  if (!Array.isArray(result.rescheduledEvents) || !Array.isArray(result.changes)) return null;
  return {
    ...result,
    originalEvents: result.originalEvents ? normalizeEvents(result.originalEvents) : undefined,
    rescheduledEvents: normalizeEvents(result.rescheduledEvents),
  } as RescheduleOption;
};
export const saveLastResult = (value: RescheduleOption) => setLocalStorage(KEYS.lastResult, value);
export const clearLastResult = () => {
  if (canUseStorage()) window.localStorage.removeItem(KEYS.lastResult);
};
export const loadWeekStart = () => getLocalStorage<string>(KEYS.weekStart);
export const saveWeekStart = (value: Date) => setLocalStorage(KEYS.weekStart, value.toISOString());
export const loadSleepPreference = () => getLocalStorage<{ bedtime: string; wakeTime: string }>(KEYS.sleep) ?? { bedtime: "00:00", wakeTime: "07:00" };
export const saveSleepPreference = (value: { bedtime: string; wakeTime: string }) => setLocalStorage(KEYS.sleep, value);
