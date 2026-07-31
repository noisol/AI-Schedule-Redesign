import { ScheduleEvent } from "../../types";

interface EventCardProps {
  event: ScheduleEvent;
}

const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

export default function EventCard({ event }: EventCardProps) {
  const startMinutes = timeToMinutes(event.startTime);
  const endMinutes = timeToMinutes(event.endTime);
  const duration = endMinutes - startMinutes;

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
    // inset-x-0 w-full 로 좌우 구분선에 여백 없이 딱 붙도록 설정
    <div
      className={`absolute inset-x-0 w-full border p-1 shadow-sm overflow-hidden z-10 transition-all hover:z-20 hover:shadow-md ${getPriorityStyles(event.priority)}`}
      style={{
        top: `${startMinutes}px`,
        height: `${Math.max(duration, 24)}px`,
      }}
    >
      <div className="text-[11px] font-bold truncate leading-tight">{event.title}</div>
      <div className="text-[9px] opacity-80 leading-tight mt-0.5 whitespace-nowrap">
        {event.startTime} - {event.endTime}
      </div>

      {event.status === "completed" && (
        <div className="absolute inset-0 bg-white/60 flex items-center justify-center font-bold text-[10px] text-gray-700 backdrop-blur-[1px]">
          완료됨
        </div>
      )}
    </div>
  );
}