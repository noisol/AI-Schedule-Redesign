// frontend/src/lib/storage.ts

export const setLocalStorage = <T>(key: string, value: T): void => {
  if (typeof window === "undefined") return; // 서버 사이드 렌더링(SSR) 에러 방지

  try {
    const serializedValue = JSON.stringify(value);
    localStorage.setItem(key, serializedValue);
  } catch (error) {
    console.error("로컬 스토리지에 데이터를 저장하는 중 에러가 발생했습니다:", error);
  }
};

export const getLocalStorage = <T>(key: string): T | null => {
  if (typeof window === "undefined") return null;

  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error("로컬 스토리지에서 데이터를 가져오는 중 에러가 발생했습니다:", error);
    return null;
  }
};