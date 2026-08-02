import { rescheduleRequestSchema, rescheduleResponseSchema } from "@/lib/validation/reschedule";
import type { RescheduleRequestInput, RescheduleResponseInput } from "@/lib/validation/reschedule";

type OpenAIResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

type OpenAIParsedResponse = {
  options?: Array<{
    optionId?: string;
    summary?: string;
    rescheduledEvents?: unknown[];
    changes?: unknown[];
    warnings?: string[];
    requiresUserConfirmation?: boolean;
  }>;
  summary?: string;
  rescheduledEvents?: unknown[];
  changes?: unknown[];
  warnings?: string[];
  requiresUserConfirmation?: boolean;
  responseId?: string;
  success?: boolean;
  interpretation?: unknown;
};

const defaultPreferences = {
  wakeUpTime: "07:00",
  sleepTime: "00:00",
  timezone: "Asia/Seoul" as const,
};

function getPreferredOpenAIModel() {
  const configuredModel = process.env.OPENAI_MODEL?.trim();
  return configuredModel || "gpt-4o";
}

function toMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function getDurationMinutes(startTime: string, endTime: string) {
  return Math.max(0, toMinutes(endTime) - toMinutes(startTime));
}

function mergeCompleteSchedule(
  originalEvents: RescheduleRequestInput["schedules"],
  proposedEvents: RescheduleResponseInput["rescheduledEvents"],
  changes: RescheduleResponseInput["changes"],
) {
  const cancelledIds = new Set(
    changes.filter((change) => change.action === "cancelled").map((change) => change.eventId),
  );
  const proposedById = new Map(proposedEvents.map((event) => [event.id, event]));
  const originalIds = new Set(originalEvents.map((event) => event.id));

  return [
    ...originalEvents.flatMap((event) => {
      if (cancelledIds.has(event.id)) return [];
      return [proposedById.get(event.id) ?? event];
    }),
    ...proposedEvents.filter((event) => !originalIds.has(event.id) && !cancelledIds.has(event.id)),
  ];
}

function buildFallbackResponse(input: RescheduleRequestInput, debug = false): RescheduleResponseInput {
  const currentTimeMinutes = toMinutes(input.currentTime);
  const rescheduledEvents = input.schedules.map((event) => {
    if (event.date !== input.currentDate) {
      return event;
    }

    const startMinutes = toMinutes(event.startTime);
    if (startMinutes < currentTimeMinutes || event.priority === "fixed") {
      return event;
    }

    const adjustedStart = Math.min(23 * 60, startMinutes + 30);
    return {
      ...event,
      startTime: formatMinutes(adjustedStart),
      endTime: formatMinutes(adjustedStart + getDurationMinutes(event.startTime, event.endTime)),
    };
  });

  const futureEvents = input.schedules.filter((event) => {
    return event.date === input.currentDate && toMinutes(event.startTime) >= currentTimeMinutes;
  });

  const changes = futureEvents.map((event) => {
    if (event.priority === "high" || event.priority === "fixed") {
      return {
        eventId: event.id,
        action: "kept" as const,
        previousStartTime: event.startTime,
        previousEndTime: event.endTime,
        newStartTime: event.startTime,
        newEndTime: event.endTime,
        reason: event.priority === "fixed"
          ? "고정된 일정이므로 날짜와 시간을 변경하지 않았습니다."
          : "중요 일정이므로 시간 변경 없이 유지했습니다.",
      };
    }

    const startMinutes = toMinutes(event.startTime);
    const shiftedStart = Math.min(23 * 60, startMinutes + 30);
    return {
      eventId: event.id,
      action: "moved" as const,
      previousStartTime: event.startTime,
      previousEndTime: event.endTime,
      newStartTime: formatMinutes(shiftedStart),
      newEndTime: formatMinutes(shiftedStart + getDurationMinutes(event.startTime, event.endTime)),
      reason: "사용자의 변경 요청을 반영하며 남은 일정을 뒤로 밀었습니다.",
    };
  });

  const optionTemplate = {
    optionId: `option-1-${Date.now()}`,
    summary: `${input.userInput}에 맞춰 당일 일정만 조정했습니다. 다른 날짜 일정은 그대로 유지합니다.`,
    rescheduledEvents,
    changes,
    warnings: [],
    requiresUserConfirmation: true,
  };

  return {
    requestId: input.requestId,
    responseId: `response-${Date.now()}`,
    success: true,
    interpretation: {
      type: "condition_change",
      targetEventId: futureEvents[0]?.id ?? null,
      title: futureEvents[0]?.title ?? null,
      additionalDurationMinutes: null,
      newDurationMinutes: null,
      newStartTime: null,
      newEndTime: null,
      description: input.userInput || "사용자 입력에 따라 일정을 재조정했습니다.",
      confidence: 0.9,
    },
    summary: `${input.userInput}에 맞춰 남은 일정의 흐름을 조정했습니다.`,
    rescheduledEvents,
    changes,
    warnings: [],
    requiresUserConfirmation: true,
    options: [
      optionTemplate,
      { ...optionTemplate, optionId: `option-2-${Date.now()}`, summary: `${input.userInput}에 대한 두 번째 재설계 제안입니다.` },
      { ...optionTemplate, optionId: `option-3-${Date.now()}`, summary: `${input.userInput}에 대한 세 번째 재설계 제안입니다.` },
    ],
    debug,
  };
}

function formatMinutes(value: number) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function parseContent(content: string | null | undefined) {
  if (!content) return null;
  const trimmed = content.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    }
    return null;
  }
}

export async function createRescheduleResponse(input: RescheduleRequestInput): Promise<RescheduleResponseInput> {
  const parsedInput = rescheduleRequestSchema.safeParse(input);

  if (!parsedInput.success) {
    return buildFallbackResponse({
      requestId: input.requestId ?? `request-${Date.now()}`,
      requestedAt: input.requestedAt ?? new Date().toISOString(),
      currentDate: input.currentDate ?? "",
      currentTime: input.currentTime ?? "00:00",
      timezone: "Asia/Seoul",
      userInput: input.userInput ?? "",
      preferences: input.preferences ?? defaultPreferences,
      schedules: input.schedules ?? [],
    });
  }

  const validatedInput = parsedInput.data;
  const apiKey = process.env.OPENAI_API_KEY;
  const preferredModel = getPreferredOpenAIModel();

  const systemPrompt = [
    "당신은 사용자의 남은 일정을 재조정하는 AI 비서입니다.",
    "새로운 일정을 처음부터 만드는 것이 아닙니다.",
    "사용자의 변경 상황이 하루 일정에 맞도록 기존 일정을 최소한으로 수정하십시오.",
    "사용자에게 표시되는 모든 설명과 요약은 반드시 자연스러운 한국어로 작성하십시오.",
    "",
    "다음 구조를 따르는 유효한 JSON 객체만 반환하십시오:",
    "{",
    "  \"requestId\": \"string\",",
    "  \"responseId\": \"string\",",
    "  \"success\": true,",
    "  \"interpretation\": {",
    "    \"type\": \"new_event|duration_increase|duration_decrease|time_change|event_cancelled|event_completed_early|unavailable_time|condition_change|other\",",
    "    \"targetEventId\": \"string|null\",",
    "    \"title\": \"string|null\",",
    "    \"additionalDurationMinutes\": 0,",
    "    \"newDurationMinutes\": 0,",
    "    \"newStartTime\": \"HH:MM|null\",",
    "    \"newEndTime\": \"HH:MM|null\",",
    "    \"description\": \"한국어 설명\",",
    "    \"confidence\": 0.0",
    "  },",
    "  \"summary\": \"string\",",
    "  \"options\": [",
    "    {",
    "      \"optionId\": \"string\",",
    "      \"summary\": \"한국어 요약\",",
    "      \"rescheduledEvents\": [",
    "        {",
    "          \"id\": \"string\",",
    "          \"title\": \"string\",",
    "          \"date\": \"YYYY-MM-DD\",",
    "          \"startTime\": \"HH:MM\",",
    "          \"endTime\": \"HH:MM\",",
    "          \"priority\": \"low|medium|high|fixed\"",
    "        }",
    "      ],",
    "      \"changes\": [",
    "        {",
    "          \"eventId\": \"string\",",
    "          \"action\": \"kept|moved|extended|shortened|split|postponed|cancelled|created\",",
    "          \"previousStartTime\": \"HH:MM|null\",",
    "          \"previousEndTime\": \"HH:MM|null\",",
    "          \"newStartTime\": \"HH:MM|null\",",
    "          \"newEndTime\": \"HH:MM|null\",",
    "          \"reason\": \"한국어 변경 이유\"",
    "        }",
    "      ],",
    "      \"warnings\": [\"한국어 경고\"],",
    "      \"requiresUserConfirmation\": true",
    "    }",
    "  ],",
    "  \"warnings\": [\"한국어 경고\"],",
    "  \"requiresUserConfirmation\": true",
    "}",
    "",
    "필수 규칙:",
    "1. 사용자 요청에서 변경 대상 일정, 대상 날짜, 변경 의도를 먼저 정확히 식별하십시오.",
    "2. 현재 날짜의 현재 시각보다 이미 지난 일정은 변경하지 마십시오. 미래 날짜의 일정에는 현재 시각 기준을 적용하지 마십시오.",
    "3. 요청 대상 일정과 그 변경으로 직접 영향을 받는 일정만 조정하십시오.",
    "4. 다른 날짜의 일정은 사용자가 날짜 이동이나 연기를 명시적으로 요청한 경우가 아니면 변경하지 마십시오.",
    "5. 변경과 무관한 일정은 ID, 제목, 날짜, 시작 시간, 종료 시간, 우선순위를 모두 원본 그대로 유지하십시오.",
    "6. 기존 일정이 유지되거나 변경되는 경우 원래 ID를 반드시 사용하고, 사용자가 요청한 새 일정에만 새로운 ID를 부여하십시오.",
    "7. priority=fixed 일정은 이동, 단축, 연장, 취소하지 마십시오. 요청을 충족할 수 없다면 경고를 작성하십시오.",
    "8. priority=high 일정은 최대한 유지하고, 충돌 해결이 필요하면 medium 또는 low 일정을 먼저 조정하십시오.",
    "9. 일정 연장이 요청되면 대상 일정을 먼저 연장하고, 실제로 겹치는 이후 일정만 순서대로 조정하십시오.",
    "10. 모든 일정은 서로 겹치지 않아야 하며 startTime은 endTime보다 빨라야 합니다.",
    "11. 모든 일정은 wakeUpTime 이후, sleepTime 이전에 배치하십시오. sleepTime이 wakeUpTime보다 이르면 다음 날 취침 시각으로 해석하십시오.",
    "12. 사용자가 요청하지 않은 일정이나 휴식·식사 일정을 임의로 새로 만들지 마십시오.",
    "13. 사용자가 지연, 취소, 조기 완료, 새 일정 생성을 말한 경우 interpretation과 실제 변경 결과에 일관되게 반영하십시오.",
    "14. changes에는 실제로 값이 달라진 일정만 포함하십시오. 변경되지 않은 일정에 kept 항목을 만들지 마십시오.",
    "15. changes의 각 항목에는 정확한 이전 시간, 새 시간, 사용자가 이해할 수 있는 구체적인 한국어 이유를 작성하십시오.",
    "16. 최상위 options 배열에는 서로 의미 있게 다른 대안 3개를 정확히 반환하십시오. 동일한 일정을 설명만 바꿔 반복하지 마십시오.",
    "17. 각 options[].rescheduledEvents는 해당 안을 적용한 뒤의 전체 일정 목록이어야 하며, 변경되지 않은 기존 일정도 빠짐없이 포함하십시오.",
    "18. action=cancelled로 changes에 명시된 일정만 rescheduledEvents에서 제외할 수 있습니다.",
    "19. 안전하고 충돌 없는 대안 3개를 만들 수 없다면 success=false로 설정하고, options 3개에는 원본 전체 일정을 그대로 넣으며 한국어 warnings로 이유를 설명하십시오.",
    "20. interpretation.description, summary, options[].summary, changes[].reason, warnings의 모든 사용자 표시 문장은 자연스러운 한국어로 작성하십시오.",
    "21. 일정 제목은 원문을 유지하되, 영어 설명 문장은 반환하지 마십시오.",
    "22. JSON 이외의 마크다운, 주석, 추가 텍스트는 절대 반환하지 마십시오.",
  ].join("\n");

  const includeRawDebug = validatedInput.debug === true;

  if (!apiKey) {
    return buildFallbackResponse(validatedInput, includeRawDebug);
  }

  try {
    const openAIRequestPayload = {
      model: preferredModel,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: JSON.stringify({
            currentDate: validatedInput.currentDate,
            currentTime: validatedInput.currentTime,
            timezone: validatedInput.timezone,
            outputLanguage: "ko-KR",
            outputLanguageInstruction: "모든 요약, 설명, 변경 이유와 경고를 자연스러운 한국어로 작성하십시오.",
            userInput: validatedInput.userInput,
            preferences: validatedInput.preferences ?? defaultPreferences,
            schedules: validatedInput.schedules,
            exampleIntent: "사용자가 어떤 일정이 더 길어졌다고 하면, 관련 일정만 연장하거나 우선순위가 낮은 작업을 미루고 무관한 일정은 건드리지 마십시오.",
          }),
        },
      ],
    };

    if (includeRawDebug) {
      console.debug("OpenAI request payload:", openAIRequestPayload);
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(openAIRequestPayload),
    });

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`OpenAI request failed: ${response.status} ${responseText}`);
    }

    let data: OpenAIResponse | null = null;
    try {
      data = JSON.parse(responseText) as OpenAIResponse;
    } catch {
      console.error("OpenAI raw response:", responseText);
      throw new Error(`OpenAI returned non-JSON response: ${responseText.slice(0, 500)}`);
    }

    const content = data?.choices?.[0]?.message?.content ?? null;
    if (includeRawDebug) {
      console.debug("OpenAI raw response text:", responseText);
      console.debug("OpenAI parsed message content:", content);
    }

    const parsed = parseContent(content) as OpenAIParsedResponse;
    if (!parsed) {
      console.error("OpenAI message content could not be parsed as JSON:", content);
      throw new Error("OpenAI returned invalid JSON");
    }

    const options = Array.isArray(parsed.options) && parsed.options.length >= 1
      ? parsed.options.slice(0, 3).map((option, index) => ({
          optionId: option.optionId ?? `option-${index + 1}-${Date.now()}`,
          summary: option.summary ?? `재설계 ${index + 1}안`,
          rescheduledEvents: option.rescheduledEvents ?? parsed.rescheduledEvents ?? [],
          changes: option.changes ?? parsed.changes ?? [],
          warnings: option.warnings ?? parsed.warnings ?? [],
          requiresUserConfirmation: option.requiresUserConfirmation ?? parsed.requiresUserConfirmation ?? true,
        }))
      : [1, 2, 3].map((index) => ({
          optionId: `option-${index}-${Date.now()}`,
          summary: parsed.summary ? `${parsed.summary} (${index}안)` : `재설계 ${index}안`,
          rescheduledEvents: parsed.rescheduledEvents ?? [],
          changes: parsed.changes ?? [],
          warnings: parsed.warnings ?? [],
          requiresUserConfirmation: parsed.requiresUserConfirmation ?? true,
        }));

    while (options.length < 3) {
      options.push({
        optionId: `option-${options.length + 1}-${Date.now()}`,
        summary: parsed.summary ? `${parsed.summary} (${options.length + 1}안)` : `재설계 ${options.length + 1}안`,
        rescheduledEvents: parsed.rescheduledEvents ?? [],
        changes: parsed.changes ?? [],
        warnings: parsed.warnings ?? [],
        requiresUserConfirmation: parsed.requiresUserConfirmation ?? true,
      });
    }

    const normalized = {
      ...parsed,
      requestId: validatedInput.requestId,
      responseId: parsed.responseId ?? `response-${Date.now()}`,
      success: parsed.success ?? true,
      interpretation: parsed.interpretation ?? {
        type: "other",
        targetEventId: null,
        title: null,
        additionalDurationMinutes: null,
        newDurationMinutes: null,
        newStartTime: null,
        newEndTime: null,
        description: validatedInput.userInput,
        confidence: 0.8,
      },
      rescheduledEvents: parsed.rescheduledEvents ?? options[0].rescheduledEvents ?? [],
      changes: parsed.changes ?? options[0].changes ?? [],
      warnings: parsed.warnings ?? [],
      requiresUserConfirmation: parsed.requiresUserConfirmation ?? true,
      options,
      debug: includeRawDebug,
      rawOpenAIRequest: includeRawDebug ? JSON.stringify(openAIRequestPayload, null, 2) : undefined,
      rawOpenAIResponse: includeRawDebug ? responseText : undefined,
    };

    const validatedResponse = rescheduleResponseSchema.parse(normalized);
    const completeOptions = validatedResponse.options.map((option) => ({
      ...option,
      rescheduledEvents: mergeCompleteSchedule(
        validatedInput.schedules,
        option.rescheduledEvents,
        option.changes,
      ),
    }));

    return {
      ...validatedResponse,
      options: completeOptions,
      rescheduledEvents: completeOptions[0].rescheduledEvents,
      changes: completeOptions[0].changes,
    };
  } catch (error) {
    console.error("Reschedule generation failed:", error);
    return buildFallbackResponse(validatedInput, includeRawDebug);
  }
}
