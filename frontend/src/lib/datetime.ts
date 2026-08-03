const SEOUL_OFFSET = "+09:00";

export const getDatePart = (at: string) => at.slice(0, 10);
export const getTimePart = (at: string) => at.slice(11, 16);

export const toTimeMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

export const addDaysToDate = (date: string, days: number) => {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day + days));
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(value.getUTCDate()).padStart(2, "0")}`;
};

export const combineDateAndTime = (date: string, time: string, dayOffset = 0) =>
  `${addDaysToDate(date, dayOffset)}T${time}:00${SEOUL_OFFSET}`;

export const addMinutesToAt = (at: string, minutes: number) => {
  const date = getDatePart(at);
  const time = getTimePart(at);
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minute] = time.split(":").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day, hours, minute + minutes));
  const nextDate = `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(value.getUTCDate()).padStart(2, "0")}`;
  const nextTime = `${String(value.getUTCHours()).padStart(2, "0")}:${String(value.getUTCMinutes()).padStart(2, "0")}`;
  return combineDateAndTime(nextDate, nextTime);
};

export const getPlanningDate = (at: string, wakeUpTime: string) =>
  toTimeMinutes(getTimePart(at)) < toTimeMinutes(wakeUpTime)
    ? addDaysToDate(getDatePart(at), -1)
    : getDatePart(at);

export const formatEventDateTime = (startAt: string, endAt: string) => {
  const startDate = getDatePart(startAt);
  const endDate = getDatePart(endAt);
  const endPrefix = startDate === endDate ? "" : `${endDate} `;
  return `${startDate} · ${getTimePart(startAt)} - ${endPrefix}${getTimePart(endAt)}`;
};

export const toDateTimeLocalValue = (at?: string) => at ? at.slice(0, 16) : "";
export const fromDateTimeLocalValue = (value: string) => `${value}:00${SEOUL_OFFSET}`;

