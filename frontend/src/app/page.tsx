// frontend/src/app/page.tsx

'use client';

import React, { useState } from 'react';
import ComparePopup from '../components/compare/ComparePopup';
import TimeGrid from '../components/calendar/TimeGrid';
import ScheduleModal from '../components/calendar/ScheduleModal'; // 👈 추가
import { mockSchedules } from '../data/mockdata';
import { ScheduleEvent } from '../types'; // 👈 추가

export default function Home() {
  const [schedules, setSchedules] = useState<ScheduleEvent[]>(mockSchedules);
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  // 모달 제어 상태 👈 추가
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialData, setModalInitialData] = useState<Partial<ScheduleEvent>>({});

  const handleApply = (selectedOption: number) => {
    alert(`${selectedOption}안이 적용되었습니다.`);
    setIsPopupOpen(false);
  };

  // 모달 열기 (버튼 클릭 or 타임라인 칸 클릭)
  const handleOpenAddModal = (date?: string, startTime?: string) => {
    const start = startTime || "09:00";
    const startHour = parseInt(start.split(":")[0], 10);
    const endHour = Math.min(startHour + 1, 23);
    const end = `${String(endHour).padStart(2, "0")}:00`;

    setModalInitialData({
      date: date || "2026-07-31",
      startTime: start,
      endTime: end,
    });
    setIsModalOpen(true);
  };

  // 새 일정 저장 처리
  const handleSaveSchedule = (newEventData: Partial<ScheduleEvent>) => {
    const newSchedule: ScheduleEvent = {
      id: `event-${Date.now()}`,
      title: newEventData.title || "새 일정",
      date: modalInitialData.date || "2026-07-31",
      startTime: newEventData.startTime || "09:00",
      endTime: newEventData.endTime || "10:00",
      durationMinutes: 60,
      priority: newEventData.priority || "medium",
      status: "scheduled",
      memo: "",
    };

    setSchedules((prev) => [...prev, newSchedule]);
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] p-6 flex flex-col items-center justify-center font-sans">
      
      {/* 메인 프레임 카드 */}
      <div className="w-full max-w-[1400px] bg-white rounded-[28px] p-6 shadow-sm border border-gray-200/80">
        
        {/* Top Header */}
        <div className="flex items-center gap-2 mb-5 pl-2">
          <span className="text-xl">✨</span>
          <h1 className="text-base font-bold text-gray-900">AI 일정 재설계</h1>
        </div>

        {/* 2열 레이아웃 */}
        <div className="grid grid-cols-12 gap-6 h-[760px]">
          
          {/* [좌측] 일정 영역 */}
          <div className="col-span-7 bg-[#fdfdfd] rounded-2xl p-5 border border-gray-100 flex flex-col justify-between overflow-hidden">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-base font-bold text-gray-800">일정</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenAddModal()}
                  className="text-[11px] bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-3 py-1.5 rounded-lg transition-colors"
                >
                  + 일정 추가
                </button>
                <button className="text-[11px] bg-red-50 hover:bg-red-100 text-red-500 font-medium px-3 py-1.5 rounded-lg transition-colors">
                  - 일정 삭제
                </button>
              </div>
            </div>

            {/* 캘린더 타임라인 연동 */}
            <div className="flex-1 overflow-hidden rounded-xl border border-gray-200/60">
              <TimeGrid
                events={schedules}
                onCellClick={(date, startTime) => handleOpenAddModal(date, startTime)}
              />
            </div>

            {/* 하단 N 로고 */}
            <div className="mt-4 flex items-center">
              <div className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-xs font-bold text-gray-700 bg-white shadow-sm">
                N
              </div>
            </div>
          </div>

          {/* [우측] 대화창 영역 */}
          <div className="col-span-5 bg-[#fdfdfd] rounded-2xl p-5 border border-gray-100 flex flex-col justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-800 mb-3">대화창</h2>
            </div>

            {/* 채팅 내역 영역 */}
            <div className="h-[520px] bg-[#fcfcfc] rounded-xl border border-gray-200/60 flex items-center justify-center text-xs text-gray-400 mb-4">
              채팅 내역
            </div>

            {/* 하단 입력창 및 버튼 */}
            <div className="space-y-2">
              <input
                type="text"
                placeholder="상황을 입력하세요..."
                className="w-full bg-[#f4f5f7] text-xs px-4 py-3 rounded-xl border-none outline-none focus:ring-1 focus:ring-blue-500 text-gray-700 placeholder-gray-400"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setIsPopupOpen(true)}
                  className="flex-1 bg-[#1b64da] hover:bg-blue-700 text-white text-xs font-bold py-3 rounded-xl transition-colors"
                >
                  결과 확인
                </button>
                <button className="bg-[#f4f5f7] hover:bg-gray-200 text-gray-700 text-xs font-medium px-4 py-3 rounded-xl transition-colors">
                  일정 수정
                </button>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* ComparePopup 모달 연동 */}
      <ComparePopup
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        onApply={handleApply}
      />

      {/* ScheduleModal 연동 👈 추가 */}
      <ScheduleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveSchedule}
        initialData={modalInitialData}
      />

    </div>
  );
}