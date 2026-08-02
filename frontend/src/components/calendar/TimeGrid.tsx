import React, { useEffect, useRef } from "react";
import { ScheduleEvent } from "../../types";
import EventCard from "./EventCard";

interface TimeGridProps {
  events: ScheduleEvent[];
  weekStart: Date;
  sleepBedtime?: string;
  sleepWakeTime?: string;
  onCellClick?: (date: string, startTime: string) => void;
  onEventClick?: (event: ScheduleEvent) => void;
}

const getWeekDays = (weekStart: Date) => {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    date.setHours(0, 0, 0, 0);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return {
      date: `${year}-${month}-${day}`,
      dayName: ["월", "화", "수", "목", "금", "토", "일"][date.getDay() === 0 ? 6 : date.getDay() - 1],
      displayDate: `${month}/${day}`,
      isToday: date.getTime() === today.getTime(),
    };
  });

  return days;
};

export default function TimeGrid({ events, weekStart, sleepBedtime, sleepWakeTime, onCellClick, onEventClick }: TimeGridProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const containerRef = useRef<HTMLDivElement>(null);

  const toMinutes = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  // 수면 구간은 캘린더에서 숨기고, 실제 보이는 시간대만 남긴다.
  const bedtimeMinutes = sleepBedtime ? toMinutes(sleepBedtime) : null;
  const wakeTimeMinutes = sleepWakeTime ? toMinutes(sleepWakeTime) : null;
  const hasSleepWindow = bedtimeMinutes !== null && wakeTimeMinutes !== null && bedtimeMinutes > wakeTimeMinutes;
  // 취침 시간 이후부터 기상 시간 전까지는 화면에서 제외한다.
  const visibleStartMinutes = hasSleepWindow ? wakeTimeMinutes : 0;
  const visibleEndMinutes = hasSleepWindow ? bedtimeMinutes : 24 * 60;
  const visibleDurationMinutes = Math.max(60, visibleEndMinutes - visibleStartMinutes);
  const topOffset = 24;

  const formatTimeLabel = (minutes: number) => {
    const normalized = minutes % (24 * 60);
    const hour = Math.floor(normalized / 60);
    const suffix = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour} ${suffix}`;
  };

  const formatTimeString = (minutes: number) => {
    const normalized = minutes % (24 * 60);
    const hour = Math.floor(normalized / 60);
    const minute = normalized % 60;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  };

  const visibleHours = Array.from({ length: Math.max(1, Math.floor(visibleDurationMinutes / 60) + 1) }, (_, index) => visibleStartMinutes + index * 60);
  const visibleEvents = hasSleepWindow
    ? events.filter((event) => {
        const startMinutes = toMinutes(event.startTime);
        const endMinutes = toMinutes(event.endTime);
        return startMinutes >= visibleStartMinutes && endMinutes <= visibleEndMinutes;
      })
    : events;
  // 수면 구간이 잘린 뒤의 위치를 기준으로 시간축과 이벤트를 다시 배치한다.
  const getPosition = (minutes: number) => {
    const base = hasSleepWindow ? minutes - visibleStartMinutes : minutes;
    return base + topOffset;
  };

  useEffect(() => {
    // 초기 진입 시에는 오전 7시쯤으로 스크롤 위치를 맞춘다.
    if (containerRef.current) {
      containerRef.current.scrollTop = 7 * 60;
    }
  }, []);

  const weekDays = getWeekDays(weekStart);

  return (
    <div className="flex h-full w-full min-h-0 flex-col overflow-hidden rounded-[24px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,250,252,0.9))] text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
      <div className="flex flex-shrink-0 border-b border-slate-200/70 bg-white/60 pr-[15px]">
        <div className="w-[50px] flex-shrink-0 border-r border-slate-200/70" />
        <div className="flex-1 grid grid-cols-7 divide-x divide-slate-200/70 py-2 text-center text-xs font-semibold">
          {weekDays.map((day) => (
            <div key={day.date} className="flex flex-col items-center justify-center py-0.5">
              <span className="text-[10px] text-slate-400">{day.displayDate}</span>
              <span
                className={`mt-0.5 rounded-full px-2 py-0.5 text-xs whitespace-nowrap ${
                  day.isToday
                    ? "bg-slate-900 text-white font-bold shadow-sm"
                    : "text-slate-700"
                }`}
              >
                {day.dayName}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div ref={containerRef} className="flex-1 min-h-0 overflow-y-auto scroll-smooth">
        <div className="relative flex w-full" style={{ height: `${visibleDurationMinutes + topOffset + 60}px` }}>
          <div className="relative w-[50px] flex-shrink-0 select-none border-r border-slate-200/70 bg-white/40">
            {visibleHours.map((minute) => (
              <div
                key={minute}
                className="absolute w-full pr-1.5 text-right text-[10px] font-medium whitespace-nowrap text-slate-400 translate-y-[-50%]"
                style={{ top: `${getPosition(minute)}px` }}
              >
                {formatTimeLabel(minute)}
              </div>
            ))}
          </div>

          <div className="relative flex-1 grid grid-cols-7 divide-x divide-slate-200/70">
            <div className="pointer-events-none absolute inset-0">
              {visibleHours.map((minute) => (
                <div key={minute} className="absolute w-full border-t border-slate-200/60" style={{ top: `${getPosition(minute)}px` }} />
              ))}
            </div>

            {weekDays.map((day) => {
              const dayEvents = visibleEvents.filter((e) => e.date === day.date);

              return (
                <div key={day.date} className="relative h-full">
                  {visibleHours.map((minute) => {
                    const timeString = formatTimeString(minute);
                    return (
                      <div
                        key={minute}
                        className="absolute h-[60px] w-full cursor-pointer transition-colors hover:bg-sky-50/70"
                        style={{ top: `${getPosition(minute)}px` }}
                        onClick={() => onCellClick?.(day.date, timeString)}
                      />
                    );
                  })}

                  {dayEvents.map((event) => (
                    <EventCard key={event.id} event={event} visibleStartMinutes={visibleStartMinutes} topOffset={topOffset} onClick={() => onEventClick?.(event)} />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}