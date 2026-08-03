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
  const rescheduledEvents = input.schedules.map((event) => ({ ...event }));
  const futureEvents = input.schedules.filter((event) => Date.parse(event.endAt) >= Date.parse(input.requestedAt));
  const changes: RescheduleResponseInput["changes"] = [];

  const optionTemplate = {
    optionId: `option-1-${Date.now()}`,
    summary: "OpenAI API 키가 없어 원본 일정을 유지했습니다.",
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
      newStartAt: null,
      newEndAt: null,
      description: input.userInput || "사용자 입력에 따라 일정을 재조정했습니다.",
      confidence: 0.9,
    },
    summary: `${input.userInput}에 맞춰 남은 일정의 흐름을 조정했습니다.`,
    rescheduledEvents,
    changes,
    warnings: [],
    requiresUserConfirmation: true,
    options: [optionTemplate],
    debug,
  };
}

function getScheduleOptionSignature(events: RescheduleResponseInput["rescheduledEvents"]) {
  return JSON.stringify(
    [...events]
      .map(({ title, startAt, endAt, priority }) => ({ title, startAt, endAt, priority }))
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
  );
}

function removeDuplicateOptions(options: RescheduleResponseInput["options"]) {
  const signatures = new Set<string>();
  return options.filter((option) => {
    const signature = getScheduleOptionSignature(option.rescheduledEvents);
    if (signatures.has(signature)) return false;
    signatures.add(signature);
    return true;
  });
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

export async function createRescheduleResponse(
  input: RescheduleRequestInput,
  retryAttempt = 0,
): Promise<RescheduleResponseInput> {
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
  const fixedEvents = validatedInput.schedules.filter((event) => event.priority === "fixed");
  const adjustableEvents = validatedInput.schedules.filter((event) => event.priority !== "fixed");
  const apiKey = process.env.OPENAI_API_KEY;
  const preferredModel = getPreferredOpenAIModel();

  const systemPrompt = [
    "당신은 사용자의 남은 일정을 재조정하는 AI 비서입니다.",
    "새로운 일정을 처음부터 만드는 것이 아닙니다.",
    "사용자의 변경 상황이 하루 일정에 맞도록 기존 일정을 최소한으로 수정하십시오.",
    "사용자에게 표시되는 모든 설명과 요약은 반드시 자연스러운 한국어로 작성하십시오.",
    "일정의 고정 여부는 입력 JSON의 priority 값만으로 판단하십시오. priority가 fixed인 일정만 고정 일정입니다.",
    "priority가 low, medium, high인 일정은 고정 일정이 아니며 필요한 경우 규칙에 따라 조정할 수 있습니다.",
    retryAttempt > 0
      ? "이전 응답에는 실행 가능한 대안이 부족하거나 서로 중복된 대안이 있었습니다. 제공된 일정 사실을 다시 확인하고 최종 시간 배치가 실제로 다른 대안을 최소 2개 만드십시오."
      : "",
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
    "    \"newStartAt\": \"ISO 8601 datetime|null\",",
    "    \"newEndAt\": \"ISO 8601 datetime|null\",",
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
    "          \"startAt\": \"YYYY-MM-DDTHH:MM:SS+09:00\",",
    "          \"endAt\": \"YYYY-MM-DDTHH:MM:SS+09:00\",",
    "          \"priority\": \"low|medium|high|fixed\"",
    "        }",
    "      ],",
    "      \"changes\": [",
    "        {",
    "          \"eventId\": \"string\",",
    "          \"action\": \"kept|moved|extended|shortened|split|postponed|cancelled|created\",",
    "          \"previousStartAt\": \"ISO 8601 datetime|null\",",
    "          \"previousEndAt\": \"ISO 8601 datetime|null\",",
    "          \"newStartAt\": \"ISO 8601 datetime|null\",",
    "          \"newEndAt\": \"ISO 8601 datetime|null\",",
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
    "5. 변경과 무관한 일정은 ID, 제목, startAt, endAt, 우선순위를 모두 원본 그대로 유지하십시오.",
    "6. 기존 일정이 유지되거나 변경되는 경우 원래 ID를 반드시 사용하고, 사용자가 요청한 새 일정에만 새로운 ID를 부여하십시오.",
    "7. priority=fixed 일정은 이동, 단축, 연장, 취소하지 마십시오. 요청을 충족할 수 없다면 경고를 작성하십시오.",
    "7-1. 사용자가 변경을 요청한 대상의 priority가 fixed가 아니라면 그 일정을 고정 일정으로 취급하지 마십시오.",
    "7-2. adjustableEvents가 하나 이상 있으면 '모든 일정이 고정되어 있다'고 판단하거나 경고하지 마십시오.",
    "8. priority=high 일정은 최대한 유지하고, 충돌 해결이 필요하면 medium 또는 low 일정을 먼저 조정하십시오.",
    "9. 일정 연장이 요청되면 대상 일정을 먼저 연장하고, 실제로 겹치는 이후 일정만 순서대로 조정하십시오.",
    "10. 모든 일정은 서로 겹치지 않아야 하며 startAt은 endAt보다 빨라야 합니다. 두 값에는 날짜, 시각, +09:00 오프셋을 모두 포함하십시오.",
    "11. 각 계획일은 wakeUpTime부터 sleepTime까지입니다. sleepTime이 wakeUpTime보다 이르거나 같으면 sleepTime은 다음 날 시각이며, 자정을 넘는 일정도 실제 날짜가 반영된 startAt과 endAt으로 표현하십시오.",
    "11-1. 자정을 넘긴다는 이유만으로 종료 날짜를 무조건 하루 더하지 마십시오. 예를 들어 8월 8일 00:00부터 01:00까지는 같은 날짜의 1시간 일정이며, 8월 8일 23:00부터 다음 날 01:00까지일 때만 endAt 날짜가 8월 9일입니다.",
    "11-2. 각 일정의 실제 분 단위 길이를 계산해 의도한 길이와 일치하는지 확인하십시오. 하루 일정 서비스이므로 단일 일정이 24시간을 초과해서는 안 됩니다.",
    "12. 사용자가 요청하지 않은 일정이나 휴식·식사 일정을 임의로 새로 만들지 마십시오.",
    "13. 사용자가 지연, 취소, 조기 완료, 새 일정 생성을 말한 경우 interpretation과 실제 변경 결과에 일관되게 반영하십시오.",
    "14. changes에는 실제로 값이 달라진 일정만 포함하십시오. 변경되지 않은 일정에 kept 항목을 만들지 마십시오.",
    "15. changes의 각 항목에는 정확한 이전 시간, 새 시간, 사용자가 이해할 수 있는 구체적인 한국어 이유를 작성하십시오.",
    "16. 최상위 options 배열에는 안전하고 의미 있게 다른 대안을 2~3개 반환하십시오. 가능한 경우 3개를 우선하고, 최소 2개는 반드시 반환하십시오.",
    "16-1. 각 대안은 이동 시각, 조정 대상 또는 조정 방식 중 적어도 하나가 실제로 달라야 합니다. 예를 들어 빈 시간의 앞부분과 뒷부분을 활용하거나, 요청 대상의 길이를 유지한 채 시작 시각을 다르게 배치하십시오.",
    "17. 각 options[].rescheduledEvents는 해당 안을 적용한 뒤의 전체 일정 목록이어야 하며, 변경되지 않은 기존 일정도 빠짐없이 포함하십시오.",
    "18. action=cancelled로 changes에 명시된 일정만 rescheduledEvents에서 제외할 수 있습니다.",
    "19. 대안 수를 맞추기 위해 동일하거나 실행 불가능한 안을 만들지 마십시오. 안전한 대안을 2개 만들 수 없다면 success=false로 설정하고 한국어 warnings로 이유를 설명하십시오.",
    "19-1. 요약이나 변경 이유만 다르고 최종 일정의 ID, startAt, endAt, priority가 같은 대안은 동일한 대안입니다. 이런 대안을 중복 반환하지 마십시오.",
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
            scheduleFacts: {
              fixedEventCount: fixedEvents.length,
              adjustableEventCount: adjustableEvents.length,
              fixedEvents: fixedEvents.map((event) => ({
                id: event.id,
                title: event.title,
                startAt: event.startAt,
                endAt: event.endAt,
              })),
              adjustableEvents: adjustableEvents.map((event) => ({
                id: event.id,
                title: event.title,
                startAt: event.startAt,
                endAt: event.endAt,
                priority: event.priority,
              })),
            },
            retryInstruction: retryAttempt > 0
              ? "중복되지 않는 대안을 최소 2개 다시 생성하십시오. 각 안의 최종 일정 시간 또는 조정 방식이 실제로 달라야 합니다."
              : undefined,
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
      : [1].map((index) => ({
          optionId: `option-${index}-${Date.now()}`,
          summary: parsed.summary ? `${parsed.summary} (${index}안)` : `재설계 ${index}안`,
          rescheduledEvents: parsed.rescheduledEvents ?? [],
          changes: parsed.changes ?? [],
          warnings: parsed.warnings ?? [],
          requiresUserConfirmation: parsed.requiresUserConfirmation ?? true,
        }));

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
        newStartAt: null,
        newEndAt: null,
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
    const completeOptions = removeDuplicateOptions(
      validatedResponse.options.map((option) => ({
        ...option,
        rescheduledEvents: mergeCompleteSchedule(
          validatedInput.schedules,
          option.rescheduledEvents,
          option.changes,
        ),
      })),
    );

    if (completeOptions.length < 2 && retryAttempt < 2 && adjustableEvents.length > 0) {
      console.warn("Retrying reschedule because fewer than two distinct options remained after deduplication.");
      return createRescheduleResponse(validatedInput, retryAttempt + 1);
    }

    if (completeOptions.length < 2) {
      return {
        ...validatedResponse,
        success: false,
        warnings: [
          ...validatedResponse.warnings,
          "서로 다른 안전한 재설계안을 최소 2개 만들지 못했습니다. 요청 조건을 조금 완화해 주세요.",
        ],
        options: completeOptions,
        rescheduledEvents: completeOptions[0].rescheduledEvents,
        changes: completeOptions[0].changes,
      };
    }

    if (!validatedResponse.success && retryAttempt === 0 && adjustableEvents.length > 0) {
      console.warn("Retrying reschedule because adjustable events were present in a failed response.");
      return createRescheduleResponse(validatedInput, retryAttempt + 1);
    }

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
