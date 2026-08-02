const ACTION_LABELS: Record<string, string> = {
  kept: "유지",
  moved: "시간 이동",
  extended: "시간 연장",
  shortened: "시간 단축",
  split: "일정 분할",
  postponed: "일정 연기",
  cancelled: "일정 취소",
  created: "새 일정",
};

export const getScheduleActionLabel = (action: string) => ACTION_LABELS[action] ?? action;

