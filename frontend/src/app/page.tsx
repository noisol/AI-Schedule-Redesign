// frontend/src/app/page.tsx

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import ComparePopup from '../components/compare/ComparePopup';
import TimeGrid from '../components/calendar/TimeGrid';
import ScheduleModal from '../components/calendar/ScheduleModal';
import { mockSchedules } from '../data/mockdata';
import {
  buildMockRescheduleOptions,
  loadDraftInput,
  loadLastResult,
  loadSchedules,
  loadSleepPreference,
  loadWeekStart,
  saveDraftInput,
  saveLastResult,
  saveSchedules,
  saveSleepPreference,
  saveWeekStart,
} from '../lib/storage';
import { ScheduleEvent } from '../types';

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
  // 저장된 일정이 있으면 불러오고, 없으면 기본 목데이터를 사용한다.
  const [schedules, setSchedules] = useState<ScheduleEvent[]>(() => loadSchedules(mockSchedules));
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialData, setModalInitialData] = useState<Partial<ScheduleEvent>>({});
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  // 입력창 초안, 최근 AI 제안, 현재 주차, 수면 패턴 상태를 로컬스토리지에서 복원한다.
  const [userInput, setUserInput] = useState(() => loadDraftInput(''));
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<ReturnType<typeof buildMockRescheduleOptions>[number] | null>(() => loadLastResult());
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

  const rescheduleOptions = useMemo(
    () =>
      buildMockRescheduleOptions(schedules, userInput, {
        bedtime: sleepBedtime,
        wakeTime: sleepWakeTime,
      }),
    [schedules, userInput, sleepBedtime, sleepWakeTime],
  );

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

    const nextSchedules = chosenOption.rescheduledEvents.map((event) => ({
      ...event,
      id: event.id,
    }));

    setSchedules(nextSchedules);
    setLastResult(chosenOption);
    saveLastResult(chosenOption);
    setSelectedOptionId(selectedOption);
    setIsPopupOpen(false);
  };

  const handleOpenAddModal = (date?: string, startTime?: string) => {
    const start = startTime || '09:00';
    const startHour = parseInt(start.split(':')[0], 10);
    const endHour = Math.min(startHour + 1, 23);
    const end = `${String(endHour).padStart(2, '0')}:00`;

    setModalMode('create');
    setModalInitialData({
      date: date || formatDateKey(weekStart),
      startTime: start,
      endTime: end,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (event: ScheduleEvent) => {
    setSelectedEventId(event.id);
    setModalMode('edit');
    setModalInitialData(event);
    setIsModalOpen(true);
  };

  const getDurationMinutes = (startTime: string, endTime: string) => {
    const toMinutes = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    return Math.max(30, toMinutes(endTime) - toMinutes(startTime));
  };

  const isTimeConflict = (candidate: Partial<ScheduleEvent>, existingEvents: ScheduleEvent[], ignoredId?: string) => {
    const candidateStart = getDurationMinutes('00:00', candidate.startTime || '00:00');
    const candidateEnd = getDurationMinutes('00:00', candidate.endTime || '00:00');

    if (candidateEnd <= candidateStart) {
      return true;
    }

    return existingEvents.some((event) => {
      if (ignoredId && event.id === ignoredId) {
        return false;
      }

      if (event.date !== candidate.date) {
        return false;
      }

      const existingStart = getDurationMinutes('00:00', event.startTime);
      const existingEnd = getDurationMinutes('00:00', event.endTime);

      return candidateStart < existingEnd && candidateEnd > existingStart;
    });
  };

  // 새 일정 저장 시 날짜/시간/충돌 여부를 함께 검증한다.
  const handleSaveSchedule = (newEventData: Partial<ScheduleEvent>) => {
    const candidateDate = newEventData.date || modalInitialData.date || formatDateKey(weekStart);
    const candidateStart = newEventData.startTime || '09:00';
    const candidateEnd = newEventData.endTime || '10:00';
    const candidate = {
      ...newEventData,
      date: candidateDate,
      startTime: candidateStart,
      endTime: candidateEnd,
      priority: newEventData.priority || 'medium',
      status: newEventData.status || 'scheduled',
      memo: newEventData.memo ?? '',
    } as Partial<ScheduleEvent>;

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
                date: candidateDate,
                startTime: candidateStart,
                endTime: candidateEnd,
                durationMinutes: getDurationMinutes(candidateStart, candidateEnd),
                priority: newEventData.priority || event.priority,
                status: newEventData.status || event.status,
                memo: newEventData.memo ?? event.memo ?? '',
              }
            : event,
        ),
      );
      return true;
    }

    const newSchedule: ScheduleEvent = {
      id: `event-${Date.now()}`,
      title: newEventData.title || '새 일정',
      date: candidateDate,
      startTime: candidateStart,
      endTime: candidateEnd,
      durationMinutes: getDurationMinutes(candidateStart, candidateEnd),
      priority: newEventData.priority || 'medium',
      status: 'scheduled',
      memo: newEventData.memo ?? '',
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

  // 사용자가 입력한 상황을 바탕으로 AI 제안 팝업을 열어준다.
  const handleSubmitPrompt = (event: React.FormEvent) => {
    event.preventDefault();
    setIsPopupOpen(true);
  };

  // 일정 완료 상태를 빠르게 토글할 수 있도록 한다.
  const toggleEventStatus = (eventId: string) => {
    setSchedules((prev) =>
      prev.map((event) => {
        if (event.id !== eventId) {
          return event;
        }

        const nextStatus: ScheduleEvent['status'] =
          event.status === 'completed' ? 'scheduled' : 'completed';

        return {
          ...event,
          status: nextStatus,
        };
      }),
    );
  };

  const handleDeleteSelected = () => {
    if (!lastResult) {
      return;
    }

    const selectedIds = new Set(lastResult.rescheduledEvents.map((event) => event.id));
    setSchedules((prev) => prev.filter((event) => !selectedIds.has(event.id)));
  };

  const selectedEvent = schedules.find((event) => event.id === selectedEventId) ?? null;

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
              <span>취침</span>
              <input
                type="time"
                value={sleepBedtime}
                onChange={(e) => setSleepBedtime(e.target.value)}
                className="rounded-full border border-slate-200/80 bg-white px-2 py-1 text-sm outline-none"
              />
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-2 text-sm text-slate-600">
              <span>기상</span>
              <input
                type="time"
                value={sleepWakeTime}
                onChange={(e) => setSleepWakeTime(e.target.value)}
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
                  onClick={handleDeleteSelected}
                  className="rounded-xl border border-rose-200/80 bg-rose-50/80 px-3 py-2 text-[11px] font-semibold text-rose-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition hover:-translate-y-0.5 hover:bg-rose-100/90"
                >
                  - 최근 제안 삭제
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden rounded-[24px] border border-white/70 bg-white/55 p-1">
              <TimeGrid
                events={schedules}
                weekStart={weekStart}
                sleepBedtime={sleepBedtime}
                sleepWakeTime={sleepWakeTime}
                onCellClick={(date, startTime) => handleOpenAddModal(date, startTime)}
                onEventClick={handleOpenEditModal}
              />
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 rounded-[20px] border border-white/70 bg-white/70 px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="glass-chip flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-semibold text-slate-700">
                  N
                </div>
                <div className="text-sm text-slate-600">
                  {selectedEvent ? `${selectedEvent.title} · ${selectedEvent.startTime}` : '카드를 눌러 일정 상세를 확인해 보세요.'}
                </div>
              </div>
              {selectedEvent && (
                <button
                  onClick={() => toggleEventStatus(selectedEvent.id)}
                  className="rounded-full border border-slate-200/80 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:bg-white"
                >
                  {selectedEvent.status === 'completed' ? '완료 해제' : '완료 처리'}
                </button>
              )}
            </div>
          </div>

          <div className="glass-panel col-span-5 flex flex-col justify-between overflow-hidden rounded-[28px] p-5">
            <div className="mb-2">
              <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-slate-900">대화창</h2>
              <p className="mt-1 text-sm text-slate-500">상황을 입력하면 제안안이 이곳에 자연스럽게 정리됩니다.</p>
            </div>

            <div className="mb-4 flex-1 min-h-0 overflow-y-auto rounded-[24px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(247,250,255,0.86))] p-4">
              <div className="space-y-3 text-xs text-slate-600">
                <div className="rounded-[18px] border border-sky-100/80 bg-sky-50/80 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                  <div className="mb-1 font-semibold text-slate-800">현재 일정</div>
                  <div>{schedules.length}개 일정이 저장되어 있습니다.</div>
                </div>

                {lastResult ? (
                  <div className="rounded-[18px] border border-emerald-100/80 bg-emerald-50/80 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                    <div className="mb-1 font-semibold text-slate-800">최근 제안</div>
                    <div>{lastResult.title}</div>
                    <div className="mt-1 text-[11px] text-slate-500">{lastResult.summary}</div>
                  </div>
                ) : (
                  <div className="rounded-[18px] border border-slate-200/80 bg-white/70 p-3 text-slate-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                    결과 확인을 누르면 최근 AI 제안이 여기에 표시됩니다.
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={handleSubmitPrompt} className="space-y-2">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="상황을 입력하세요..."
                className="w-full rounded-[16px] border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
              />
              <button
                type="submit"
                className="w-full rounded-[16px] bg-slate-900 px-4 py-3 text-[13px] font-semibold text-white shadow-[0_10px_24px_rgba(15,23,42,0.14)] transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                결과 확인
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