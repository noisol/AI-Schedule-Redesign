"use client";

import React from "react";
import { ScheduleEvent } from "../../types";
import { getScheduleActionLabel } from "../../lib/schedule-change";

interface ComparePopupProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (selectedOption: number) => void;
  currentSchedules?: ScheduleEvent[];
  options: Array<{
    id: number;
    title: string;
    summary: string;
    rescheduledEvents: ScheduleEvent[];
    changes: Array<{ eventId: string; action: string; reason: string }>;
  }>;
  selectedOptionId: number | null;
  onSelectOption: (optionId: number | null) => void;
}

export default function ComparePopup({
  isOpen,
  onClose,
  onApply,
  currentSchedules = [],
  options,
  selectedOptionId,
  onSelectOption,
}: ComparePopupProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
      <div className="glass-panel relative flex h-[760px] max-h-[92vh] w-full max-w-6xl flex-col rounded-[34px] p-6 shadow-[0_40px_120px_rgba(15,23,42,0.18)]">
        <div className="mb-5 shrink-0 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            AI 제안 결과
          </div>
          <h2 className="text-[24px] font-semibold tracking-[-0.02em] text-slate-900">3가지 재설계안 중 하나를 골라보세요.</h2>
          <p className="mt-2 text-sm text-slate-500">각 제안은 오늘의 흐름을 더 자연스럽게 이어주도록 구성되어 있습니다.</p>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-3 gap-4 overflow-hidden">
          {options.map((option) => {
            const displayedChanges = option.changes.filter((change) => change.action !== "kept");
            const relatedIds = new Set(displayedChanges.map((change) => change.eventId));
            const relatedCurrentSchedules = currentSchedules.filter((event) => relatedIds.has(event.id));
            const relatedRescheduledEvents = option.rescheduledEvents.filter((event) => relatedIds.has(event.id));

            return (
              <div
                key={option.id}
                onClick={() => onSelectOption(option.id)}
                className={`flex min-h-0 cursor-pointer flex-col overflow-y-auto rounded-[24px] border p-4 pr-3 transition ${
                  selectedOptionId === option.id
                    ? "border-sky-300/80 bg-sky-50/85 shadow-[0_16px_36px_rgba(14,116,144,0.14)]"
                    : "border-white/80 bg-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]"
                }`}
              >
              <h3 className="mb-3 border-b border-slate-200/70 pb-2 text-[16px] font-semibold text-slate-900">{option.title}</h3>
              <p className="text-sm leading-6 text-slate-600">{option.summary}</p>

              <div className="mt-4 min-h-0">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">변경 사항</div>
                <div className="space-y-2 text-xs text-slate-600">
                  {displayedChanges.map((change, changeIndex) => (
                    <div key={`${option.id}-${change.eventId}-${changeIndex}`} className="rounded-[14px] border border-white/70 bg-white/80 p-2">
                      <div className="font-semibold text-slate-700">{getScheduleActionLabel(change.action)}</div>
                      <div className="mt-0.5">{change.reason}</div>
                    </div>
                  ))}
                  {displayedChanges.length === 0 && <div className="text-slate-400">변경된 일정이 없습니다.</div>}
                </div>
              </div>

              <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3">
                <div>
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">기존 일정</div>
                  <div className="space-y-1 text-xs text-slate-600">
                    {relatedCurrentSchedules.map((event) => (
                      <div key={`current-${event.id}`} className="rounded-[12px] border border-slate-200/70 bg-slate-50/80 px-2 py-1.5">
                        <div className="font-medium text-slate-700">{event.title}</div>
                        <div className="mt-0.5 text-[11px] text-slate-500">{event.date} · {event.startTime} - {event.endTime}</div>
                      </div>
                    ))}
                    {relatedCurrentSchedules.length === 0 && <div className="text-slate-400">기존 일정 없음</div>}
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">예상 일정</div>
                  <div className="space-y-1 text-xs text-slate-600">
                    {relatedRescheduledEvents.map((event) => (
                      <div key={event.id} className="rounded-[12px] border border-slate-200/70 bg-white/70 px-2 py-1.5">
                        <div className="font-medium text-slate-700">{event.title}</div>
                        <div className="mt-0.5 text-[11px] text-slate-500">{event.date} · {event.startTime} - {event.endTime}</div>
                      </div>
                    ))}
                    {relatedRescheduledEvents.length === 0 && <div className="text-slate-400">취소되어 예상 일정에서 제외됨</div>}
                  </div>
                </div>
              </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex shrink-0 items-center justify-center gap-4 border-t border-slate-200/70 pt-5">
          <button
            onClick={() => {
              onSelectOption(null);
              onClose();
            }}
            className="rounded-[16px] border border-slate-200/80 bg-white/70 px-8 py-3 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-white"
          >
            수정 취소
          </button>

          <button
            onClick={() => {
              if (selectedOptionId) {
                onApply(selectedOptionId);
              } else {
                alert("일정을 적용하려면 먼저 하나의 안을 선택해주세요.");
              }
            }}
            className={`rounded-[16px] px-8 py-3 text-sm font-semibold text-white transition ${
              selectedOptionId ? "bg-slate-900 hover:-translate-y-0.5 hover:bg-slate-800" : "cursor-not-allowed bg-slate-400"
            }`}
          >
            일정 적용
          </button>
        </div>
      </div>
    </div>
  );
}
