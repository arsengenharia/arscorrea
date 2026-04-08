import * as React from "react";
import { format, parseISO, isAfter, startOfDay, isSameDay } from "date-fns";
import { MapPin, CalendarClock } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { CalendarEvent } from "@/hooks/use-calendar-events";

interface SidebarEventListProps {
  events: CalendarEvent[];
  selectedDate: Date;
  onEventClick: (event: CalendarEvent) => void;
}

export function SidebarEventList({
  events,
  selectedDate,
  onEventClick,
}: SidebarEventListProps) {
  const dayStart = startOfDay(selectedDate);

  const upcomingEvents = React.useMemo(() => {
    return events
      .filter((event) => {
        const eventDate = parseISO(event.start_at);
        return (
          isAfter(eventDate, dayStart) || isSameDay(eventDate, dayStart)
        );
      })
      .sort(
        (a, b) =>
          new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
      )
      .slice(0, 10);
  }, [events, dayStart]);

  return (
    <div>
      <Separator className="my-4" />
      <div className="flex items-center gap-2 mb-3">
        <CalendarClock className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Proximos Eventos</h3>
      </div>

      {upcomingEvents.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          Nenhum evento proximo
        </p>
      ) : (
        <ScrollArea className="max-h-[300px]">
          <div className="space-y-1 pr-2">
            {upcomingEvents.map((event) => (
              <button
                key={event.id}
                onClick={() => onEventClick(event)}
                className="w-full text-left px-2 py-1.5 rounded-md hover:bg-accent/50 transition-colors group"
              >
                <div className="text-[11px] text-muted-foreground font-medium">
                  {event.all_day ? (
                    "Dia inteiro"
                  ) : (
                    <>
                      {format(parseISO(event.start_at), "HH:mm")}
                      {" - "}
                      {format(parseISO(event.end_at), "HH:mm")}
                    </>
                  )}
                  {!isSameDay(parseISO(event.start_at), selectedDate) && (
                    <span className="ml-1">
                      {format(parseISO(event.start_at), "dd/MM")}
                    </span>
                  )}
                </div>
                <div className="text-xs font-medium truncate group-hover:text-primary transition-colors">
                  {event.title}
                </div>
                {event.location && (
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{event.location}</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
