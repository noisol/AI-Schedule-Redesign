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
  const containerRef = useRef<HTMLDivElement>(null);

  const toMinutes = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  // 수면 구간은 캘린더에서 숨기고, 실제 보이는 시간대만 남긴다.
  const bedtimeMinutes = sleepBedtime ? toMinutes(sleepBedtime) : null;
  const wakeTimeMinutes = sleepWakeTime ? toMinutes(sleepWakeTime) : null;
  const visibleStartMinutes = wakeTimeMinutes ?? 0;
  // 00:00처럼 취침 시간이 기상 시간보다 이르면 다음 날 시간으로 취급한다.
  const visibleEndMinutes = bedtimeMinutes === null
    ? 24 * 60
    : bedtimeMinutes <= visibleStartMinutes
      ? bedtimeMinutes + 24 * 60
      : bedtimeMinutes;
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
  const toVisibleMinutes = (time: string) => {
    const minutes = toMinutes(time);
    return visibleEndMinutes > 24 * 60 && minutes < visibleStartMinutes
      ? minutes + 24 * 60
      : minutes;
  };
  const visibleEvents = events.filter((event) => {
    const startMinutes = toVisibleMinutes(event.startTime);
    let endMinutes = toVisibleMinutes(event.endTime);
    if (endMinutes <= startMinutes) endMinutes += 24 * 60;
    return startMinutes >= visibleStartMinutes && endMinutes <= visibleEndMinutes;
  });
  // 수면 구간이 잘린 뒤의 위치를 기준으로 시간축과 이벤트를 다시 배치한다.
  const getPosition = (minutes: number) => {
    return minutes - visibleStartMinutes + topOffset;
  };

  useEffect(() => {
    // 표시 범위 자체가 기상 시간부터 시작하므로 항상 맨 위에서 보여준다.
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [visibleStartMinutes, visibleEndMinutes]);

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
                  {visibleHours.slice(0, -1).map((minute) => {
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

                  {dayEvents.map((event) => {
                    const displayStartMinutes = toVisibleMinutes(event.startTime);
                    let displayEndMinutes = toVisibleMinutes(event.endTime);
                    if (displayEndMinutes <= displayStartMinutes) displayEndMinutes += 24 * 60;

                    return (
                      <EventCard
                        key={event.id}
                        event={event}
                        visibleStartMinutes={visibleStartMinutes}
                        topOffset={topOffset}
                        displayStartMinutes={displayStartMinutes}
                        displayEndMinutes={displayEndMinutes}
                        onClick={() => onEventClick?.(event)}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
