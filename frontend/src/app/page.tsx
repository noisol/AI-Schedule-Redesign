// frontend/src/app/page.tsx

'use client';

import React, { useEffect, useState, useSyncExternalStore } from 'react';
import ComparePopup from '../components/compare/ComparePopup';
import TimeGrid from '../components/calendar/TimeGrid';
import ScheduleModal from '../components/calendar/ScheduleModal';
import { mockSchedules } from '../data/mockdata';
import {
  loadDraftInput,
  loadLastResult,
  loadSchedules,
  loadSleepPreference,
  loadWeekStart,
  saveDraftInput,
  clearLastResult,
  saveLastResult,
  saveSchedules,
  saveSleepPreference,
  saveWeekStart,
} from '../lib/storage';
import type { RescheduleOption } from '../lib/storage';
import { rescheduleResponseSchema } from '../lib/validation/reschedule';
import { getScheduleActionLabel } from '../lib/schedule-change';
import {
  addMinutesToAt,
  combineDateAndTime,
  formatEventDateTime,
  getPlanningDate,
  getTimePart,
  toTimeMinutes,
} from '../lib/datetime';
import { ScheduleEvent } from '../types';

const subscribeToHydration = () => () => {};

const formatEventSchedule = (event: ScheduleEvent) =>
  formatEventDateTime(event.startAt, event.endAt);

const mergeRescheduledEvents = (
  currentEvents: ScheduleEvent[],
  proposedEvents: ScheduleEvent[],
  changes: Array<{ eventId: string; action: string }>,
) => {
  const cancelledIds = new Set(
    changes.filter((change) => change.action === 'cancelled').map((change) => change.eventId),
  );
  const proposedById = new Map(proposedEvents.map((event) => [event.id, event]));

  const merged = currentEvents.flatMap((event) => {
    if (cancelledIds.has(event.id)) return [];
    return [proposedById.get(event.id) ?? event];
  });
  const currentIds = new Set(currentEvents.map((event) => event.id));

  return [
    ...merged,
    ...proposedEvents.filter((event) => !currentIds.has(event.id) && !cancelledIds.has(event.id)),
  ];
};

const getScheduleSignature = (events: ScheduleEvent[]) => JSON.stringify(
  [...events]
    .map(({ title, startAt, endAt, priority }) => ({ title, startAt, endAt, priority }))
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
);

const removeDuplicateRescheduleOptions = (options: RescheduleOption[]) => {
  const signatures = new Set<string>();
  return options.filter((option) => {
    const signature = getScheduleSignature(option.rescheduledEvents);
    if (signatures.has(signature)) return false;
    signatures.add(signature);
    return true;
  });
};

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getWeekStart = (date: Date) => {
  const weekStart = new Date(date);
  weekStart.setHours(0, 0, 0, 0);
  const day = weekStart.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  weekStart.setDate(weekStart.getDate() + diff);
  return weekStart;
};

const formatWeekLabel = (weekStart: Date) => {
  const end = new Date(weekStart);
  end.setDate(weekStart.getDate() + 6);
  const startText = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;
  const endText = `${end.getMonth() + 1}/${end.getDate()}`;
  return `${startText} ~ ${endText}`;
};

export default function Home() {
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  // 저장된 일정이 있으면 불러오고, 없으면 기본 목데이터를 사용한다.
  const [schedules, setSchedules] = useState<ScheduleEvent[]>(() => loadSchedules(mockSchedules));
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialData, setModalInitialData] = useState<Partial<ScheduleEvent>>({});
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  // 입력창 초안, 최근 AI 제안, 현재 주차, 수면 패턴 상태를 로컬스토리지에서 복원한다.
  const [userInput, setUserInput] = useState(() => loadDraftInput(''));
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<RescheduleOption | null>(() => loadLastResult());
  const [rescheduleOptions, setRescheduleOptions] = useState<RescheduleOption[]>([]);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const savedWeekStart = loadWeekStart();
    return savedWeekStart ? new Date(savedWeekStart) : getWeekStart(new Date());
  });
  const [sleepBedtime, setSleepBedtime] = useState(() => loadSleepPreference().bedtime);
  const [sleepWakeTime, setSleepWakeTime] = useState(() => loadSleepPreference().wakeTime);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // 일정이 바뀔 때마다 로컬스토리지에 자동 저장한다.
  useEffect(() => {
    saveSchedules(schedules);
  }, [schedules]);

  // 수면 패턴 변경 시에도 저장해 다음 접속 시 그대로 반영된다.
  useEffect(() => {
    saveSleepPreference({ bedtime: sleepBedtime, wakeTime: sleepWakeTime });
  }, [sleepBedtime, sleepWakeTime]);

  // 현재 보고 있는 주차 위치도 저장해 새로고침 시 유지한다.
  useEffect(() => {
    saveWeekStart(weekStart);
  }, [weekStart]);

  // 입력창에 적은 내용은 임시 초안으로 저장해 둔다.
  useEffect(() => {
    saveDraftInput(userInput);
  }, [userInput]);

  const closeModal = () => {
    setIsModalOpen(false);
    setModalMode('create');
    setModalInitialData({});
  };

  const handleApply = (selectedOption: number) => {
    const chosenOption = rescheduleOptions.find((option) => option.id === selectedOption);
    if (!chosenOption) {
      return;
    }

    const nextSchedules = mergeRescheduledEvents(
      schedules,
      chosenOption.rescheduledEvents,
      chosenOption.changes,
    );

    setSchedules(nextSchedules);
    setLastResult(chosenOption);
    saveLastResult(chosenOption);
    setSelectedOptionId(selectedOption);
    setIsPopupOpen(false);
  };

  const handleOpenAddModal = (startAt?: string) => {
    const start = startAt || combineDateAndTime(formatDateKey(weekStart), '09:00');

    setModalMode('create');
    setModalInitialData({
      startAt: start,
      endAt: addMinutesToAt(start, 60),
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (event: ScheduleEvent) => {
    setSelectedEventId(event.id);
    setModalMode('edit');
    setModalInitialData(event);
    setIsModalOpen(true);
  };

  const isTimeConflict = (candidate: Partial<ScheduleEvent>, existingEvents: ScheduleEvent[], ignoredId?: string) => {
    const candidateStart = candidate.startAt ? Date.parse(candidate.startAt) : Number.NaN;
    const candidateEnd = candidate.endAt ? Date.parse(candidate.endAt) : Number.NaN;

    if (!Number.isFinite(candidateStart) || !Number.isFinite(candidateEnd) || candidateEnd <= candidateStart) {
      return true;
    }

    return existingEvents.some((event) => {
      if (ignoredId && event.id === ignoredId) {
        return false;
      }

      const existingStart = Date.parse(event.startAt);
      const existingEnd = Date.parse(event.endAt);

      return candidateStart < existingEnd && candidateEnd > existingStart;
    });
  };

  // 새 일정 저장 시 절대 날짜·시간과 충돌 여부를 함께 검증한다.
  const handleSaveSchedule = (newEventData: Partial<ScheduleEvent>) => {
    const candidateStartAt = newEventData.startAt || modalInitialData.startAt;
    const candidateEndAt = newEventData.endAt || modalInitialData.endAt;
    const candidate = {
      ...newEventData,
      startAt: candidateStartAt,
      endAt: candidateEndAt,
      priority: newEventData.priority || 'medium',
    } as Partial<ScheduleEvent>;

    if (!candidateStartAt || !candidateEndAt || Date.parse(candidateEndAt) <= Date.parse(candidateStartAt)) {
      window.alert('종료 날짜·시간은 시작 날짜·시간보다 늦어야 해요.');
      return false;
    }

    const endMoment = addMinutesToAt(candidateEndAt, -1);
    if (getPlanningDate(candidateStartAt, sleepWakeTime) !== getPlanningDate(endMoment, sleepWakeTime)) {
      window.alert('하나의 일정은 같은 생활일 안에 있어야 해요. 자정을 넘길 수는 있지만 다음 기상 시간 전에는 끝나야 합니다.');
      return false;
    }

    const currentId = modalMode === 'edit' && newEventData.id ? newEventData.id : undefined;
    const hasConflict = isTimeConflict(candidate, schedules, currentId);

    if (hasConflict) {
      window.alert('이미 같은 시간대에 일정이 있어요.');
      return false;
    }

    if (modalMode === 'edit' && newEventData.id) {
      setSchedules((prev) =>
        prev.map((event) =>
          event.id === newEventData.id
            ? {
                ...event,
                title: newEventData.title || event.title,
                startAt: candidateStartAt || event.startAt,
                endAt: candidateEndAt || event.endAt,
                priority: newEventData.priority || event.priority,
              }
            : event,
        ),
      );
      return true;
    }

    const newSchedule: ScheduleEvent = {
      id: `event-${Date.now()}`,
      title: newEventData.title || '새 일정',
      startAt: candidateStartAt || combineDateAndTime(formatDateKey(weekStart), '09:00'),
      endAt: candidateEndAt || combineDateAndTime(formatDateKey(weekStart), '10:00'),
      priority: newEventData.priority || 'medium',
    };

    setSchedules((prev) => [...prev, newSchedule]);
    return true;
  };

  // 일정 삭제 시 선택된 카드 상태도 함께 정리한다.
  const handleDeleteSchedule = (eventId: string) => {
    setSchedules((prev) => prev.filter((event) => event.id !== eventId));
    setSelectedEventId((prev) => (prev === eventId ? null : prev));
    closeModal();
  };

  // 사용자가 입력한 상황과 현재 일정을 서버로 보내 실제 AI 제안을 받는다.
  const handleSubmitPrompt = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!userInput.trim() || isRescheduling) return;

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    setIsRescheduling(true);
    setRescheduleError(null);

    try {
      const response = await fetch('/api/reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: `request-${Date.now()}`,
          requestedAt: now.toISOString(),
          currentDate: formatDateKey(now),
          currentTime,
          timezone: 'Asia/Seoul',
          userInput: userInput.trim(),
          preferences: {
            wakeUpTime: sleepWakeTime,
            sleepTime: sleepBedtime,
            timezone: 'Asia/Seoul',
          },
          schedules,
        }),
      });

      const body: unknown = await response.json();
      if (!response.ok) {
        const message = typeof body === 'object' && body !== null && 'error' in body
          ? String((body as { error?: { message?: string } }).error?.message ?? 'AI 일정 재설계에 실패했습니다.')
          : 'AI 일정 재설계에 실패했습니다.';
        throw new Error(message);
      }

      const result = rescheduleResponseSchema.parse(body);
      if (!result.success) {
        throw new Error(result.warnings[0] ?? '재설계 가능한 일정을 만들지 못했습니다.');
      }

      const nextOptions = removeDuplicateRescheduleOptions(result.options.map((option, index) => {
        const changes = option.changes.map((change) => ({
          eventId: change.eventId,
          action: change.action,
          reason: change.reason,
        }));

        return {
          id: index + 1,
          title: `${index + 1}안`,
          summary: option.summary,
          originalEvents: schedules.map((event) => ({ ...event })),
          rescheduledEvents: mergeRescheduledEvents(schedules, option.rescheduledEvents, changes),
          changes,
        };
      }));

      setRescheduleOptions(nextOptions);
      setSelectedOptionId(null);
      setUserInput('');
      setIsPopupOpen(true);
    } catch (error) {
      setRescheduleError(error instanceof Error ? error.message : 'AI 일정 재설계에 실패했습니다.');
    } finally {
      setIsRescheduling(false);
    }
  };

  const handleUndoLastReschedule = () => {
    if (!lastResult?.originalEvents) {
      window.alert('되돌릴 수 있는 최근 AI 재설계 기록이 없습니다.');
      return;
    }

    setSchedules(lastResult.originalEvents.map((event) => ({ ...event })));
    setLastResult(null);
    setSelectedOptionId(null);
    setRescheduleOptions([]);
    clearLastResult();
  };

  const selectedEvent = schedules.find((event) => event.id === selectedEventId) ?? null;
  const lastResultChanges = lastResult?.changes.filter((change) => change.action !== 'kept') ?? [];
  const bedtimeIsNextDay = toTimeMinutes(sleepBedtime) <= toTimeMinutes(sleepWakeTime);

  if (!isHydrated) {
    return <div className="min-h-screen" aria-hidden="true" />;
  }

  return (
    <div className="relative min-h-screen overflow-hidden p-4 sm:p-6 lg:p-8 font-sans text-slate-800">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="liquid-drop left-[-8%] top-[-6%] h-56 w-56 opacity-80 blur-3xl" />
        <div className="liquid-drop right-[-8%] top-[8%] h-64 w-64 opacity-70 blur-3xl" />
        <div className="liquid-drop bottom-[-6%] left-[24%] h-60 w-60 opacity-70 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-[1400px] flex-col rounded-[36px] border border-white/70 bg-white/55 p-4 shadow-[0_30px_90px_rgba(15,23,42,0.10)] backdrop-blur-2xl sm:p-6 lg:p-7">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 rounded-t-[36px] bg-gradient-to-b from-white/80 via-white/20 to-transparent" />
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 px-1">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-xl">
              <span className="h-2 w-2 rounded-full bg-sky-500" />
              AI 일정 재설계
            </div>
            <h1 className="text-[25px] font-semibold tracking-[-0.02em] text-slate-900">오늘의 계획을 더 부드럽게 다시 정리해보세요.</h1>
            <p className="mt-1 text-sm text-slate-500">미세한 변경도 자연스럽게 반영하고, 흐름을 다시 조율해 드립니다.</p>
          </div>
          <div className="glass-chip rounded-2xl px-4 py-3 text-sm text-slate-600">
            <div className="font-semibold text-slate-800">현재 상태</div>
            <div>{schedules.length}개의 일정이 저장되어 있어요.</div>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-white/70 bg-white/60 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekStart((prev) => {
                const next = new Date(prev);
                next.setDate(prev.getDate() - 7);
                return next;
              })}
              className="rounded-full border border-slate-200/80 bg-white/80 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-white"
            >
              ← 이전 주
            </button>
            <div className="rounded-full border border-slate-200/80 bg-slate-900 px-3 py-2 text-sm font-semibold text-white">
              {formatWeekLabel(weekStart)}
            </div>
            <button
              onClick={() => setWeekStart((prev) => {
                const next = new Date(prev);
                next.setDate(prev.getDate() + 7);
                return next;
              })}
              className="rounded-full border border-slate-200/80 bg-white/80 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-white"
            >
              다음 주 →
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">수면 패턴</label>
            <div className="flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-2 text-sm text-slate-600">
              <span>기상</span>
              <input
                type="time"
                value={sleepWakeTime}
                onChange={(e) => setSleepWakeTime(e.target.value)}
                className="rounded-full border border-slate-200/80 bg-white px-2 py-1 text-sm outline-none"
              />
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-2 text-sm text-slate-600">
              <span>취침</span>
              {bedtimeIsNextDay && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700">다음 날</span>}
              <input
                type="time"
                value={sleepBedtime}
                onChange={(e) => setSleepBedtime(e.target.value)}
                className="rounded-full border border-slate-200/80 bg-white px-2 py-1 text-sm outline-none"
              />
            </div>
          </div>
        </div>

        <div className="grid h-[760px] grid-cols-12 gap-6">
          <div className="glass-panel col-span-7 flex flex-col justify-between overflow-hidden rounded-[28px] p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-slate-900">일정</h2>
                <p className="mt-1 text-sm text-slate-500">카드를 클릭해 바로 수정하고, 빈 칸을 눌러 새 일정을 추가하세요.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenAddModal()}
                  className="glass-chip rounded-xl px-3 py-2 text-[11px] font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-white/90"
                >
                  + 일정 추가
                </button>
                <button
                  onClick={handleUndoLastReschedule}
                  disabled={!lastResult?.originalEvents}
                  className="rounded-xl border border-rose-200/80 bg-rose-50/80 px-3 py-2 text-[11px] font-semibold text-rose-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition hover:-translate-y-0.5 hover:bg-rose-100/90 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                >
                  ↩ 최근 재설계 되돌리기
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden rounded-[24px] border border-white/70 bg-white/55 p-1">
              <TimeGrid
                events={schedules}
                weekStart={weekStart}
                sleepBedtime={sleepBedtime}
                sleepWakeTime={sleepWakeTime}
                onCellClick={handleOpenAddModal}
                onEventClick={handleOpenEditModal}
              />
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 rounded-[20px] border border-white/70 bg-white/70 px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="glass-chip flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-semibold text-slate-700">
                  N
                </div>
                <div className="text-sm text-slate-600">
                  {selectedEvent ? `${selectedEvent.title} · ${getTimePart(selectedEvent.startAt)}` : '카드를 눌러 일정 상세를 확인해 보세요.'}
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel col-span-5 flex flex-col justify-between overflow-hidden rounded-[28px] p-5">
            <div className="mb-2">
              <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-slate-900">대화창</h2>
              <p className="mt-1 text-sm text-slate-500">상황을 입력하면 제안안이 이곳에 자연스럽게 정리됩니다.</p>
            </div>

            <div className="mb-4 flex-1 min-h-0 overflow-y-auto rounded-[24px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(247,250,255,0.86))] p-4">
              <div className="space-y-3 text-xs text-slate-600">
                {lastResult ? (
                  <div className="rounded-[18px] border border-emerald-100/80 bg-emerald-50/80 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                    <div className="mb-1 font-semibold text-slate-800">선택한 제안</div>
                    <div className="font-medium text-emerald-900">{lastResult.title}</div>
                    <div className="mt-1 leading-5 text-slate-600">{lastResult.summary}</div>
                    <div className="mt-3 border-t border-emerald-200/70 pt-3">
                      <div className="mb-2 font-semibold text-slate-700">선택한 안의 변경 내용</div>
                      <div className="space-y-2">
                        {lastResultChanges.map((change, changeIndex) => {
                          const originalEvent = lastResult.originalEvents?.find((event) => event.id === change.eventId);
                          const changedEvent = lastResult.rescheduledEvents.find((event) => event.id === change.eventId);
                          return (
                            <div key={`last-${change.eventId}-${changeIndex}`} className="rounded-xl bg-white/70 p-2">
                              <div className="font-semibold text-slate-700">{getScheduleActionLabel(change.action)}</div>
                              <div className="mt-0.5 leading-5 text-slate-600">{change.reason}</div>
                              <div className="mt-2 space-y-1 rounded-lg bg-slate-50/80 p-2 text-[11px]">
                                <div className="text-slate-500">
                                  <span className="font-semibold text-slate-600">기존</span>{' '}
                                  {originalEvent ? `${originalEvent.title} · ${formatEventSchedule(originalEvent)}` : '없음'}
                                </div>
                                <div className="text-emerald-700">
                                  <span className="font-semibold">변경</span>{' '}
                                  {changedEvent ? `${changedEvent.title} · ${formatEventSchedule(changedEvent)}` : '일정에서 제외됨'}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {lastResultChanges.length === 0 && <div className="text-slate-500">변경된 일정이 없습니다.</div>}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[18px] border border-slate-200/80 bg-white/70 p-3 text-slate-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                    상황을 입력하고 AI 일정 재설계를 요청해 보세요.
                  </div>
                )}
                {rescheduleError && (
                  <div className="rounded-[18px] border border-rose-200/80 bg-rose-50/80 p-3 text-rose-700">
                    <div className="mb-1 font-semibold">요청 오류</div>
                    <div>{rescheduleError}</div>
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={handleSubmitPrompt} className="space-y-2">
              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="상황을 입력하세요..."
                rows={4}
                className="min-h-[104px] w-full resize-y rounded-[16px] border border-white/70 bg-white/80 px-4 py-3 text-sm leading-6 text-slate-700 outline-none placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
              />
              <button
                type="submit"
                disabled={isRescheduling || !userInput.trim()}
                className="w-full rounded-[16px] bg-slate-900 px-4 py-3 text-[13px] font-semibold text-white shadow-[0_10px_24px_rgba(15,23,42,0.14)] transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {isRescheduling ? 'AI가 재설계 중...' : 'AI 일정 재설계'}
              </button>
            </form>
          </div>
        </div>
      </div>

      <ComparePopup
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        onApply={handleApply}
        currentSchedules={schedules}
        options={rescheduleOptions}
        selectedOptionId={selectedOptionId}
        onSelectOption={setSelectedOptionId}
      />

      <ScheduleModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={handleSaveSchedule}
        onDelete={handleDeleteSchedule}
        initialData={modalInitialData}
        mode={modalMode}
        existingEvent={modalMode === 'edit' ? (modalInitialData as ScheduleEvent) : null}
      />
    </div>
  );
}
