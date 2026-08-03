import { NextResponse } from "next/server";
import { createRescheduleResponse } from "@/lib/openai/reschedule";
import { rescheduleRequestSchema } from "@/lib/validation/reschedule";

export async function GET() {
  const html = `<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Reschedule API Debug</title>
    <style>
      body { font-family: system-ui, sans-serif; margin: 24px; background: #090b12; color: #f8fafc; }
      textarea { width: 100%; min-height: 260px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 14px; background: #111827; color: #e2e8f0; border: 1px solid #334155; border-radius: 14px; padding: 14px; resize: vertical; }
      button { padding: 12px 18px; background: #4f46e5; color: white; border: none; border-radius: 10px; cursor: pointer; transition: transform 0.12s ease, background 0.12s ease; }
      button:hover { background: #4338ca; transform: translateY(-1px); }
      .button-row { margin-top: 16px; display: flex; gap: 12px; flex-wrap: wrap; }
      pre { width: 100%; min-height: 520px; max-height: calc(100vh - 300px); background: #020617; color: #e2e8f0; padding: 20px; border-radius: 18px; overflow: auto; white-space: pre-wrap; word-break: break-word; font-size: 13px; line-height: 1.55; border: 1px solid #2e3a52; }
      .container { max-width: 1200px; margin: auto; }
      code { background: rgba(148, 163, 184, 0.12); padding: 2px 6px; border-radius: 6px; }
      h1 { margin-bottom: 6px; }
      h2 { margin-top: 32px; margin-bottom: 10px; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Reschedule API Debug</h1>
      <p>이 페이지에서 <code>/api/reschedule</code> POST 요청을 보낼 수 있습니다. 응답이 아래에 표시됩니다.</p>
      <label for="requestBody">요청 JSON:</label>
      <textarea id="requestBody">{
  "requestId": "request-1",
  "requestedAt": "2026-08-02T10:00:00.000Z",
  "currentDate": "2026-08-02",
  "currentTime": "10:00",
  "timezone": "Asia/Seoul",
  "userInput": "회의 시간이 30분 늘어났어요. 나머지 일정을 조정해주세요.",
  "preferences": {
    "wakeUpTime": "07:00",
    "sleepTime": "23:00",
    "timezone": "Asia/Seoul"
  },
  "schedules": [
    {
      "id": "event-1",
      "title": "오전 회의",
      "date": "2026-08-02",
      "startTime": "10:00",
      "endTime": "11:00",
      "priority": "high"
    }
  ],
  "debug": true
}</textarea>
      <div class="button-row">
        <button id="sendBtn">POST 요청 보내기</button>
        <button id="resetBtn" type="button">샘플 내용으로 초기화</button>
      </div>
      <h2>응답</h2>
      <pre id="responseOutput">여기에 응답이 표시됩니다.</pre>
    </div>
    <script>
      const sendBtn = document.getElementById('sendBtn');
      const resetBtn = document.getElementById('resetBtn');
      const requestBody = document.getElementById('requestBody');
      const responseOutput = document.getElementById('responseOutput');

      sendBtn.addEventListener('click', async () => {
        try {
          const body = JSON.parse(requestBody.value);
          responseOutput.textContent = '요청 중...';
          const res = await fetch('/api/reschedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          const text = await res.text();
          try {
            const json = JSON.parse(text);
            responseOutput.textContent = JSON.stringify(json, null, 2);
          } catch {
            responseOutput.textContent = text;
          }
        } catch (error) {
          responseOutput.textContent = '에러: ' + error;
        }
      });

      resetBtn.addEventListener('click', () => {
        requestBody.value = JSON.stringify({
          requestId: "request-1",
          requestedAt: "2026-08-02T10:00:00.000Z",
          currentDate: "2026-08-02",
          currentTime: "10:00",
          timezone: "Asia/Seoul",
          userInput: "회의 시간이 30분 늘어났어요. 나머지 일정을 조정해주세요.",
          preferences: {
            wakeUpTime: "07:00",
            sleepTime: "23:00",
            timezone: "Asia/Seoul",
          },
          schedules: [
            {
              id: "event-1",
              title: "오전 회의",
              date: "2026-08-02",
              startTime: "10:00",
              endTime: "11:00",
              priority: "high",
            },
          ],
          debug: true,
        }, null, 2);
      });
    </script>
  </body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=UTF-8" },
  });
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    let payload: unknown = {};

    if (rawBody.trim()) {
      try {
        payload = JSON.parse(rawBody);
      } catch {
        console.error("Invalid JSON body:", rawBody);
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "INVALID_REQUEST",
              message: "요청 본문이 올바른 JSON이 아닙니다.",
            },
          },
          { status: 400 },
        );
      }
    }

    const parsed = rescheduleRequestSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_REQUEST",
            message: "요청 형식이 올바르지 않습니다.",
          },
        },
        { status: 400 },
      );
    }

    const response = await createRescheduleResponse(parsed.data);
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Reschedule API error:", error);
    const errorOption = {
      optionId: `option-error-${Date.now()}`,
      summary: "AI 오류로 인해 제안된 일정이 없습니다.",
      rescheduledEvents: [],
      changes: [],
      warnings: ["AI 응답 생성 중 오류가 발생했습니다."],
      requiresUserConfirmation: false,
    };

    return NextResponse.json(
      {
        requestId: `request-${Date.now()}`,
        responseId: `response-${Date.now()}`,
        success: false,
        interpretation: {
          type: "other",
          targetEventId: null,
          title: null,
          additionalDurationMinutes: null,
          newDurationMinutes: null,
          newStartTime: null,
          newEndTime: null,
          description: "AI 재설계 중 오류가 발생했습니다.",
          confidence: 0.0,
        },
        summary: "AI 재설계 중 오류가 발생했습니다.",
        rescheduledEvents: [],
        changes: [],
        warnings: ["AI 응답 생성 중 오류가 발생했습니다."],
        requiresUserConfirmation: false,
        options: [errorOption],
      },
      { status: 200 },
    );
  }
}
