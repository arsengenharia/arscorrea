import * as React from "react";
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isToday,
  parseISO,
  getHours,
  getMinutes,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/hooks/use-calendar-events";

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onTimeSlotClick: (date: Date, hour: number) => void;
}

export function WeekView({ currentDate, events, onEventClick, onTimeSlotClick }: WeekViewProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getEventsForDay = (day: Date) => {
    return events.filter((event) => {
      const eventDate = parseISO(event.start_at);
      return isSameDay(eventDate, day);
    });
  };

  const getEventPosition = (event: CalendarEvent) => {
    const start = parseISO(event.start_at);
    const end = parseISO(event.end_at);
    const startHour = getHours(start) + getMinutes(start) / 60;
    const endHour = getHours(end) + getMinutes(end) / 60;
    const duration = endHour - startHour;

    return {
      top: `${startHour * 48}px`,
      height: `${Math.max(duration * 48, 24)}px`,
    };
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* All-day events row */}
      <div className="flex border-b">
        <div className="w-16 flex-shrink-0 border-r" />
        {days.map((day) => {
          const allDayEvents = getEventsForDay(day).filter((e) => e.all_day);
          return (
            <div
              key={day.toISOString()}
              className="flex-1 border-r last:border-r-0 min-h-[32px] p-1"
            >
              {allDayEvents.map((event) => (
                <button
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className="w-full text-left text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 truncate block mb-1"
                >
                  {event.title}
                </button>
              ))}
            </div>
          );
        })}
      </div>

      {/* Header with days */}
      <div className="flex border-b">
        <div className="w-16 flex-shrink-0 border-r" />
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={cn(
              "flex-1 p-2 text-center border-r last:border-r-0",
              isToday(day) && "bg-primary/5"
            )}
          >
            <div className="text-xs text-muted-foreground uppercase">
              {format(day, "EEE", { locale: ptBR })}
            </div>
            <div
              className={cn(
                "text-lg font-medium w-8 h-8 flex items-center justify-center rounded-full mx-auto",
                isToday(day) && "bg-primary text-primary-foreground"
              )}
            >
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="relative flex">
          {/* Time labels */}
          <div className="w-16 flex-shrink-0">
            {hours.map((hour) => (
              <div
                key={hour}
                className="h-12 border-b text-xs text-muted-foreground text-right pr-2 pt-0"
                style={{ marginTop: hour === 0 ? 0 : -6 }}
              >
                {format(new Date().setHours(hour, 0), "HH:mm")}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day) => {
            const dayEvents = getEventsForDay(day).filter((e) => !e.all_day);

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "flex-1 relative border-r last:border-r-0",
                  isToday(day) && "bg-primary/5"
                )}
              >
                {/* Hour slots */}
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="h-12 border-b border-l hover:bg-accent/30 cursor-pointer"
                    onClick={() => onTimeSlotClick(day, hour)}
                  />
                ))}

                {/* Events */}
                {dayEvents.map((event) => {
                  const position = getEventPosition(event);
                  return (
                    <button
                      key={event.id}
                      onClick={() => onEventClick(event)}
                      className="absolute left-1 right-1 text-xs px-1.5 py-0.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 overflow-hidden text-left"
                      style={position}
                    >
                      <div className="font-medium truncate">{event.title}</div>
                      <div className="opacity-80">
                        {format(parseISO(event.start_at), "HH:mm")} -{" "}
                        {format(parseISO(event.end_at), "HH:mm")}
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
