import * as React from "react";
import {
  format,
  isSameDay,
  isToday,
  parseISO,
  getHours,
  getMinutes,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/hooks/use-calendar-events";

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onTimeSlotClick: (date: Date, hour: number) => void;
}

export function DayView({ currentDate, events, onEventClick, onTimeSlotClick }: DayViewProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const dayEvents = events.filter((event) => {
    const eventDate = parseISO(event.start_at);
    return isSameDay(eventDate, currentDate);
  });

  const allDayEvents = dayEvents.filter((e) => e.all_day);
  const timedEvents = dayEvents.filter((e) => !e.all_day);

  const getEventPosition = (event: CalendarEvent) => {
    const start = parseISO(event.start_at);
    const end = parseISO(event.end_at);
    const startHour = getHours(start) + getMinutes(start) / 60;
    const endHour = getHours(end) + getMinutes(end) / 60;
    const duration = endHour - startHour;

    return {
      top: `${startHour * 60}px`,
      height: `${Math.max(duration * 60, 30)}px`,
    };
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b p-4 text-center">
        <div className="text-sm text-muted-foreground uppercase">
          {format(currentDate, "EEEE", { locale: ptBR })}
        </div>
        <div
          className={cn(
            "text-3xl font-medium w-12 h-12 flex items-center justify-center rounded-full mx-auto",
            isToday(currentDate) && "bg-primary text-primary-foreground"
          )}
        >
          {format(currentDate, "d")}
        </div>
      </div>

      {/* All-day events */}
      {allDayEvents.length > 0 && (
        <div className="border-b p-2 space-y-1">
          {allDayEvents.map((event) => (
            <button
              key={event.id}
              onClick={() => onEventClick(event)}
              className="w-full text-left text-sm px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20"
            >
              {event.title}
            </button>
          ))}
        </div>
      )}

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="relative flex">
          {/* Time labels */}
          <div className="w-20 flex-shrink-0">
            {hours.map((hour) => (
              <div
                key={hour}
                className="h-[60px] border-b text-xs text-muted-foreground text-right pr-2"
                style={{ paddingTop: 2 }}
              >
                {format(new Date().setHours(hour, 0), "HH:mm")}
              </div>
            ))}
          </div>

          {/* Day column */}
          <div className="flex-1 relative border-l">
            {/* Hour slots */}
            {hours.map((hour) => (
              <div
                key={hour}
                className="h-[60px] border-b hover:bg-accent/30 cursor-pointer"
                onClick={() => onTimeSlotClick(currentDate, hour)}
              />
            ))}

            {/* Events */}
            {timedEvents.map((event) => {
              const position = getEventPosition(event);
              return (
                <button
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className="absolute left-2 right-2 text-sm px-2 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 overflow-hidden text-left"
                  style={position}
                >
                  <div className="font-medium truncate">{event.title}</div>
                  <div className="opacity-80 text-xs">
                    {format(parseISO(event.start_at), "HH:mm")} -{" "}
                    {format(parseISO(event.end_at), "HH:mm")}
                  </div>
                  {event.location && (
                    <div className="opacity-70 text-xs truncate">{event.location}</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
