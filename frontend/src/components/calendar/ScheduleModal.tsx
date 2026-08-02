// frontend/src/components/calendar/ScheduleModal.tsx

import { useEffect, useState, type FormEvent } from "react";
import { ScheduleEvent } from "../../types";

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
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [priority, setPriority] = useState<ScheduleEvent["priority"]>("medium");

  useEffect(() => {
    if (isOpen) {
      const eventData = existingEvent ?? initialData;
      setTitle(eventData?.title || "");
      setDate(eventData?.date || "");
      setStartTime(eventData?.startTime || "09:00");
      setEndTime(eventData?.endTime || "10:00");
      setPriority(eventData?.priority || "medium");
    }
  }, [isOpen, existingEvent, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const shouldClose = onSave({
      id: existingEvent?.id,
      title,
      date: existingEvent?.date ?? (date || initialData?.date),
      startTime,
      endTime,
      priority,
      status: existingEvent?.status ?? "scheduled",
      memo: existingEvent?.memo ?? "",
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-md rounded-[28px] p-6 shadow-[0_30px_90px_rgba(15,23,42,0.12)]">
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

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">날짜</label>
            <input
              type="date"
              required
              className="w-full rounded-[14px] border border-white/70 bg-white/80 px-3 py-2.5 text-sm text-slate-700 outline-none"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-slate-700">시작 시간</label>
              <input
                type="time"
                required
                className="w-full rounded-[14px] border border-white/70 bg-white/80 px-3 py-2.5 text-sm text-slate-700 outline-none"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-slate-700">종료 시간</label>
              <input
                type="time"
                required
                className="w-full rounded-[14px] border border-white/70 bg-white/80 px-3 py-2.5 text-sm text-slate-700 outline-none"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">우선순위</label>
            <div className="flex gap-2">
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

          <div className="mt-2 flex justify-end gap-2 border-t border-slate-200/70 pt-4">
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