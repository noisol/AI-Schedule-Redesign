// frontend/src/components/calendar/ScheduleModal.tsx

import { useState, type FormEvent } from "react";
import { ScheduleEvent } from "../../types";
import { fromDateTimeLocalValue, toDateTimeLocalValue } from "../../lib/datetime";

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: Partial<ScheduleEvent>) => boolean | void;
  onDelete?: (eventId: string) => void;
  initialData?: Partial<ScheduleEvent>;
  mode?: "create" | "edit";
  existingEvent?: ScheduleEvent | null;
}

export default function ScheduleModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialData,
  mode = "create",
  existingEvent,
}: ScheduleModalProps) {
  if (!isOpen) return null;

  const eventData = existingEvent ?? initialData;
  return (
    <ScheduleModalForm
      key={`${mode}-${existingEvent?.id ?? eventData?.startAt ?? "new"}`}
      onClose={onClose}
      onSave={onSave}
      onDelete={onDelete}
      mode={mode}
      existingEvent={existingEvent}
      eventData={eventData}
    />
  );
}

function ScheduleModalForm({
  onClose,
  onSave,
  onDelete,
  mode,
  existingEvent,
  eventData,
}: Omit<ScheduleModalProps, "isOpen" | "initialData"> & { eventData?: Partial<ScheduleEvent> }) {
  const [title, setTitle] = useState(eventData?.title || "");
  const [startAt, setStartAt] = useState(toDateTimeLocalValue(eventData?.startAt));
  const [endAt, setEndAt] = useState(toDateTimeLocalValue(eventData?.endAt));
  const [priority, setPriority] = useState<ScheduleEvent["priority"]>(eventData?.priority || "medium");
  const durationMinutes = startAt && endAt
    ? (Date.parse(fromDateTimeLocalValue(endAt)) - Date.parse(fromDateTimeLocalValue(startAt))) / 60_000
    : 0;
  const durationLabel = durationMinutes > 0
    ? `${Math.floor(durationMinutes / 60)}시간${durationMinutes % 60 ? ` ${durationMinutes % 60}분` : ""}`
    : null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const shouldClose = onSave({
      id: existingEvent?.id,
      title,
      startAt: fromDateTimeLocalValue(startAt),
      endAt: fromDateTimeLocalValue(endAt),
      priority,
    });

    if (shouldClose !== false) {
      onClose();
    }
  };

  const handleDelete = () => {
    if (existingEvent?.id && onDelete) {
      onDelete(existingEvent.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/35 p-4 backdrop-blur-sm">
      <div className="glass-panel my-auto w-full max-w-xl rounded-[28px] p-5 shadow-[0_30px_90px_rgba(15,23,42,0.12)] sm:p-6">
        <h2 className="mb-4 text-[22px] font-semibold tracking-[-0.02em] text-slate-900">
          {mode === "edit" ? "일정 수정" : "새 일정 추가"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">일정 제목</label>
            <input
              type="text"
              required
              className="w-full rounded-[14px] border border-white/70 bg-white/80 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
              placeholder="예: 팀 주간 회의"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="min-w-0">
              <label className="mb-1 block text-sm font-medium text-slate-700">시작 날짜·시간</label>
              <input
                type="datetime-local"
                required
                className="w-full rounded-[14px] border border-white/70 bg-white/80 px-3 py-2.5 text-sm text-slate-700 outline-none"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
              />
            </div>
            <div className="min-w-0">
              <label className="mb-1 block text-sm font-medium text-slate-700">종료 날짜·시간</label>
              <input
                type="datetime-local"
                required
                className="w-full rounded-[14px] border border-white/70 bg-white/80 px-3 py-2.5 text-sm text-slate-700 outline-none"
                value={endAt}
                min={startAt}
                onChange={(e) => setEndAt(e.target.value)}
              />
            </div>
          </div>

          {durationLabel && (
            <p className={`rounded-xl px-3 py-2 text-xs ${durationMinutes > 24 * 60 ? "bg-rose-50 text-rose-600" : "bg-sky-50 text-slate-600"}`}>
              일정 길이: <span className="font-semibold">{durationLabel}</span>
              {durationMinutes > 24 * 60 && " · 날짜를 다시 확인해 주세요."}
            </p>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">우선순위</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(["high", "medium", "low", "fixed"] as const).map((p) => (
                <label key={p} className="flex-1 cursor-pointer">
                  <input
                    type="radio"
                    name="priority"
                    value={p}
                    checked={priority === p}
                    onChange={() => setPriority(p)}
                    className="sr-only peer"
                  />
                  <div className="rounded-[14px] border border-white/70 bg-white/70 py-2 text-center text-sm text-slate-700 transition peer-checked:border-sky-300 peer-checked:bg-sky-50/80">
                    {p === "high" && "🔴 높음"}
                    {p === "medium" && "🟠 중간"}
                    {p === "low" && "🔵 낮음"}
                    {p === "fixed" && "⚫ 고정"}
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="mt-2 flex flex-wrap justify-end gap-2 border-t border-slate-200/70 pt-4">
            {mode === "edit" && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-[14px] bg-rose-50/80 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-100/90"
              >
                삭제
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-[14px] border border-slate-200/80 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white"
            >
              취소
            </button>
            <button
              type="submit"
              className="rounded-[14px] bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
