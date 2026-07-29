"use client";

import React, { useState } from "react";

interface ComparePopupProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (selectedOption: number) => void;
}

export default function ComparePopup({ isOpen, onClose, onApply }: ComparePopupProps) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 left-0 w-full h-full bg-black/60 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-3xl shadow-2xl w-[900px] h-[600px] flex flex-col p-8 border border-gray-200 relative">
        
        <div className="mb-6 text-center">
          <h2 className="text-3xl font-bold text-gray-800">AI 일정 재설계 제안</h2>
          <p className="text-gray-500 mt-2">원하시는 일정(1안, 2안, 3안)을 눌러서 선택해주세요.</p>
        </div>

        <div className="grid grid-cols-3 gap-6 flex-1">
          {[1, 2, 3].map((option) => (
            <div
              key={option}
              onClick={() => setSelectedOption(option)}
              className={`border-4 rounded-xl p-6 cursor-pointer flex flex-col ${
                selectedOption === option 
                  ? 'border-blue-600 bg-blue-50' 
                  : 'border-gray-300'
              }`}
            >
              <h3 className="text-2xl font-bold mb-4 text-center pb-4 border-b-2 border-gray-200">{option}안</h3>
              <div className="flex-1 flex items-center justify-center text-gray-500 font-medium text-center">
                {option}안 상세 내역
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center items-center mt-8 pt-8 border-t border-gray-200 gap-10">
          <button
            onClick={() => {
              setSelectedOption(null);
              onClose();
            }}
            className="px-12 py-4 bg-gray-200 text-gray-800 font-bold text-xl rounded-xl hover:bg-gray-300"
          >
            수정 취소
          </button>
          
          <button
            onClick={() => {
              if (selectedOption) {
                onApply(selectedOption);
              } else {
                alert("일정을 추가하려면 먼저 1안, 2안, 3안 중 하나를 선택해주세요.");
              }
            }}
            className={`px-12 py-4 font-bold text-xl rounded-xl ${
              selectedOption 
                ? 'bg-black text-white' 
                : 'bg-gray-400 text-white cursor-not-allowed'
            }`}
          >
            일정 추가
          </button>
        </div>
      </div>
    </div>
  );
}