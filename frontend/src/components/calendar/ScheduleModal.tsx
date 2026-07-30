// frontend/src/components/calendar/ScheduleModal.tsx

import { useState, useEffect } from "react";
import { ScheduleEvent } from "../../types";

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: Partial<ScheduleEvent>) => void;
  initialData?: Partial<ScheduleEvent>; // 빈 공간 클릭 시 초기 시간값 등을 넘겨받음
}

export default function ScheduleModal({ isOpen, onClose, onSave, initialData }: ScheduleModalProps) {
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [priority, setPriority] = useState<ScheduleEvent["priority"]>("medium");

  // 모달이 열릴 때 초기 데이터 세팅
  useEffect(() => {
    if (isOpen) {
      setTitle(initialData?.title || "");
      setStartTime(initialData?.startTime || "09:00");
      setEndTime(initialData?.endTime || "10:00");
      setPriority(initialData?.priority || "medium");
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title,
      startTime,
      endTime,
      priority,
      status: "scheduled",
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up">
        <h2 className="text-xl font-bold mb-4 text-gray-800">새 일정 추가</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 일정 제목 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">일정 제목</label>
            <input
              type="text"
              required
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="예: 팀 주간 회의"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* 시간 설정 */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">시작 시간</label>
              <input
                type="time"
                required
                className="w-full border border-gray-300 rounded-lg p-2.5 outline-none"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">종료 시간</label>
              <input
                type="time"
                required
                className="w-full border border-gray-300 rounded-lg p-2.5 outline-none"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* 우선순위 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">우선순위 (색상)</label>
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
                  <div className="text-center py-2 text-sm border rounded-lg peer-checked:ring-2 peer-checked:ring-blue-500 hover:bg-gray-50 transition">
                    {p === "high" && "🔴 높음"}
                    {p === "medium" && "🟠 중간"}
                    {p === "low" && "🔵 낮음"}
                    {p === "fixed" && "⚫ 고정"}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 버튼 영역 */}
          <div className="flex justify-end gap-2 pt-4 mt-2 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
            >
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}