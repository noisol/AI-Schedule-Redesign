// src/hooks/useSchedule.ts
import { useState, useEffect } from "react";
import { STORAGE_KEYS } from "../constants";
import { getLocalStorage, setLocalStorage } from "../lib/storage";
import { ScheduleEvent } from "../types";
import { mockSchedules } from "../data/mockdata"; // 팀원님이 만드신 더미 데이터 연결

export const useSchedule = () => {
  const [schedules, setSchedules] = useState<ScheduleEvent[]>([]);
  const [isLoaded, setIsLoaded] = useState(false); // 화면 깜빡임 방지용 상태

  useEffect(() => {
    // 화면이 처음 켜질 때, 로컬 스토리지에 저장된 일정이 있는지 확인합니다.
    const savedSchedules = getLocalStorage<ScheduleEvent[]>(STORAGE_KEYS.SCHEDULES);
    
    if (savedSchedules && savedSchedules.length > 0) {
      setSchedules(savedSchedules); // 저장된 게 있으면 그것을 씁니다.
    } else {
      setSchedules(mockSchedules); // 저장된 게 없으면 기본 모크 데이터를 세팅합니다.
      setLocalStorage(STORAGE_KEYS.SCHEDULES, mockSchedules);
    }
    setIsLoaded(true);
  }, []);

  // 이 함수를 부르면 화면도 바뀌고 로컬 스토리지도 동시에 업데이트됩니다.
  const updateSchedules = (newSchedules: ScheduleEvent[]) => {
    setSchedules(newSchedules);
    setLocalStorage(STORAGE_KEYS.SCHEDULES, newSchedules);
  };

  return { schedules, updateSchedules, isLoaded };
};