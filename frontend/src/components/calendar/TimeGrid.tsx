import React, { useEffect, useRef } from "react";
import { ScheduleEvent } from "../../types";
import EventCard from "./EventCard";

interface TimeGridProps {
  events: ScheduleEvent[];
  onCellClick?: (date: string, startTime: string) => void; // 👈 추가
}

export default function TimeGrid({ events, onCellClick }: TimeGridProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 7 * 60;
    }
  }, []);

  const weekDays = [
    { date: "2026-07-27", dayName: "월", displayDate: "7/27" },
    { date: "2026-07-28", dayName: "화", displayDate: "7/28" },
    { date: "2026-07-29", dayName: "수", displayDate: "7/29" },
    { date: "2026-07-30", dayName: "목", displayDate: "7/30" },
    { date: "2026-07-31", dayName: "금", displayDate: "7/31", isToday: true },
    { date: "2026-08-01", dayName: "토", displayDate: "8/1" },
    { date: "2026-08-02", dayName: "일", displayDate: "8/2" },
  ];

  return (
    <div className="h-full w-full flex flex-col min-h-0 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden text-gray-800">
      {/* 1. 상단 고정 요일 헤더 */}
      <div className="flex border-b border-gray-200 bg-gray-50/80 pr-[15px] flex-shrink-0">
        <div className="w-[50px] flex-shrink-0 border-r border-gray-200" />
        <div className="flex-1 grid grid-cols-7 divide-x divide-gray-200 text-center py-2 text-xs font-semibold">
          {weekDays.map((day) => (
            <div key={day.date} className="flex flex-col items-center justify-center py-0.5">
              <span className="text-gray-400 text-[10px]">{day.displayDate}</span>
              <span
                className={`mt-0.5 px-2 py-0.5 rounded-md text-xs whitespace-nowrap ${
                  day.isToday
                    ? "bg-pink-500 text-white font-bold shadow-sm"
                    : "text-gray-800"
                }`}
              >
                {day.dayName}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. 세로 스크롤 타임라인 영역 */}
      <div ref={containerRef} className="flex-1 min-h-0 overflow-y-auto scroll-smooth">
        <div className="relative w-full flex" style={{ height: `${24 * 60}px` }}>
          
          {/* [좌측] 24시간 라벨 */}
          <div className="w-[50px] flex-shrink-0 border-r border-gray-200 relative bg-gray-50/30 select-none">
            {hours.map((hour) => (
              <div
                key={hour}
                className="absolute w-full pr-1.5 text-right text-[10px] text-gray-400 font-medium translate-y-[-50%] whitespace-nowrap"
                style={{ top: `${hour * 60}px` }}
              >
                {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
              </div>
            ))}
          </div>

          {/* [우측] 7일 세로 칸 및 시간선 */}
          <div className="flex-1 grid grid-cols-7 divide-x divide-gray-200 relative">
            
            {/* 가로 눈금선 */}
            <div className="absolute inset-0 pointer-events-none">
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="absolute w-full border-t border-gray-100"
                  style={{ top: `${hour * 60}px` }}
                />
              ))}
            </div>

            {/* 7개 요일별 컬럼 */}
            {weekDays.map((day) => {
              const dayEvents = events.filter((e) => e.date === day.date);

              return (
                <div key={day.date} className="relative h-full">
                  {/* 빈 타임슬롯 클릭 영역 (1시간 단위) 👈 추가됨 */}
                  {hours.map((hour) => {
                    const timeString = `${String(hour).padStart(2, "0")}:00`;
                    return (
                      <div
                        key={hour}
                        className="absolute w-full h-[60px] hover:bg-blue-50/40 cursor-pointer transition-colors"
                        style={{ top: `${hour * 60}px` }}
                        onClick={() => onCellClick?.(day.date, timeString)}
                      />
                    );
                  })}

                  {/* 일정 카드 렌더링 */}
                  {dayEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
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