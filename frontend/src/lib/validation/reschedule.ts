import { z } from "zod";

export const schedulePrioritySchema = z.enum(["low", "medium", "high", "fixed"]);
export const disruptionTypeSchema = z.enum([
  "new_event",
  "duration_increase",
  "duration_decrease",
  "time_change",
  "event_cancelled",
  "event_completed_early",
  "unavailable_time",
  "condition_change",
  "other",
]);
export const scheduleChangeActionSchema = z.enum([
  "kept",
  "moved",
  "extended",
  "shortened",
  "split",
  "postponed",
  "cancelled",
  "created",
]);

export const scheduleEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  startAt: z.iso.datetime({ offset: true }),
  endAt: z.iso.datetime({ offset: true }),
  priority: schedulePrioritySchema,
}).refine((event) => Date.parse(event.endAt) > Date.parse(event.startAt), {
  message: "endAt must be later than startAt",
  path: ["endAt"],
}).refine((event) => Date.parse(event.endAt) - Date.parse(event.startAt) <= 24 * 60 * 60 * 1000, {
  message: "an event cannot span more than 24 hours",
  path: ["endAt"],
});

export const userPreferencesSchema = z.object({
  wakeUpTime: z.string(),
  sleepTime: z.string(),
  timezone: z.literal("Asia/Seoul"),
});

export const rescheduleRequestSchema = z.object({
  requestId: z.string(),
  requestedAt: z.string(),
  currentDate: z.string(),
  currentTime: z.string(),
  timezone: z.literal("Asia/Seoul"),
  userInput: z.string(),
  preferences: userPreferencesSchema,
  schedules: z.array(scheduleEventSchema),
  debug: z.boolean().optional(),
});

export const interpretationSchema = z.object({
  type: disruptionTypeSchema,
  targetEventId: z.string().nullable(),
  title: z.string().nullable(),
  additionalDurationMinutes: z.number().int().nullable(),
  newDurationMinutes: z.number().int().nullable(),
  newStartAt: z.string().nullable(),
  newEndAt: z.string().nullable(),
  description: z.string(),
  confidence: z.number().min(0).max(1),
});

export const scheduleChangeSchema = z.object({
  eventId: z.string(),
  action: scheduleChangeActionSchema,
  previousStartAt: z.string().nullable(),
  previousEndAt: z.string().nullable(),
  newStartAt: z.string().nullable(),
  newEndAt: z.string().nullable(),
  reason: z.string(),
});

export const rescheduledOptionSchema = z.object({
  optionId: z.string(),
  summary: z.string(),
  rescheduledEvents: z.array(scheduleEventSchema),
  changes: z.array(scheduleChangeSchema),
  warnings: z.array(z.string()),
  requiresUserConfirmation: z.boolean(),
});

export const rescheduleResponseSchema = z.object({
  requestId: z.string(),
  responseId: z.string(),
  success: z.boolean(),
  interpretation: interpretationSchema,
  summary: z.string(),
  rescheduledEvents: z.array(scheduleEventSchema),
  changes: z.array(scheduleChangeSchema),
  warnings: z.array(z.string()),
  requiresUserConfirmation: z.boolean(),
  options: z.array(rescheduledOptionSchema).min(1).max(3),
  debug: z.boolean().optional(),
  rawOpenAIRequest: z.string().optional(),
  rawOpenAIResponse: z.string().optional(),
});

export type ScheduleEventInput = z.infer<typeof scheduleEventSchema>;
export type UserPreferencesInput = z.infer<typeof userPreferencesSchema>;
export type RescheduleRequestInput = z.infer<typeof rescheduleRequestSchema>;
export type InterpretationInput = z.infer<typeof interpretationSchema>;
export type ScheduleChangeInput = z.infer<typeof scheduleChangeSchema>;
export type RescheduledOptionInput = z.infer<typeof rescheduledOptionSchema>;
export type RescheduleResponseInput = z.infer<typeof rescheduleResponseSchema>;
