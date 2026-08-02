import { ScheduleEvent } from "../../types";

interface EventCardProps {
  event: ScheduleEvent;
  visibleStartMinutes?: number;
  topOffset?: number;
  onClick?: () => void;
}

const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

export default function EventCard({ event, visibleStartMinutes = 0, topOffset = 0, onClick }: EventCardProps) {
  const startMinutes = timeToMinutes(event.startTime) - visibleStartMinutes + topOffset;
  const endMinutes = timeToMinutes(event.endTime) - visibleStartMinutes + topOffset;
  const duration = Math.max(36, endMinutes - startMinutes);

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case "fixed": return "bg-gray-800 border-gray-900 text-white";
      case "high": return "bg-red-100 border-red-300 text-red-900";
      case "medium": return "bg-orange-100 border-orange-300 text-orange-900";
      case "low": return "bg-blue-100 border-blue-300 text-blue-900";
      default: return "bg-white border-gray-300 text-gray-800";
    }
  };

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={`absolute inset-x-0 z-10 mx-1 overflow-hidden rounded-[14px] border border-white/80 p-2 shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all hover:z-20 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(15,23,42,0.12)] cursor-pointer ${getPriorityStyles(event.priority)}`}
      style={{
        top: `${startMinutes}px`,
        height: `${Math.max(duration, 36)}px`,
      }}
    >
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
        <div className="truncate text-[11px] font-semibold leading-tight">{event.title}</div>
      </div>
      <div className="mt-1 text-[9px] leading-tight whitespace-nowrap opacity-80">
        {event.startTime} - {event.endTime}
      </div>

      {event.status === "completed" && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 text-[10px] font-semibold text-slate-700 backdrop-blur-[1px]">
          완료됨
        </div>
      )}
    </div>
  );
}