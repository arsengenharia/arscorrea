import * as React from "react";
import { format, parseISO, isAfter, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MapPin } from "lucide-react";
import type { CalendarEvent } from "@/hooks/use-calendar-events";

interface AgendaViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

export function AgendaView({ currentDate, events, onEventClick }: AgendaViewProps) {
  // Filter and sort events from current date onwards
  const today = startOfDay(currentDate);
  const upcomingEvents = events
    .filter((event) => {
      const eventDate = parseISO(event.start_at);
      return isAfter(eventDate, today) || format(eventDate, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");
    })
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());

  // Group by date
  const groupedEvents = upcomingEvents.reduce((groups, event) => {
    const dateKey = format(parseISO(event.start_at), "yyyy-MM-dd");
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(event);
    return groups;
  }, {} as Record<string, CalendarEvent[]>);

  const dateKeys = Object.keys(groupedEvents).sort();

  if (upcomingEvents.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-lg">Nenhum evento agendado</p>
          <p className="text-sm">Clique em "Criar" para adicionar um novo evento</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {dateKeys.map((dateKey) => {
          const date = parseISO(dateKey);
          const dayEvents = groupedEvents[dateKey];

          return (
            <div key={dateKey}>
              {/* Date header */}
              <div className="sticky top-0 bg-background py-2 border-b mb-3">
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-bold text-primary">{format(date, "d")}</div>
                  <div>
                    <div className="text-sm font-medium capitalize">
                      {format(date, "EEEE", { locale: ptBR })}
                    </div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {format(date, "MMMM yyyy", { locale: ptBR })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Events for this date */}
              <div className="space-y-2">
                {dayEvents.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => onEventClick(event)}
                    className="w-full text-left p-3 rounded-lg border hover:bg-accent/50 transition-colors group"
                  >
                    <div className="flex gap-3">
                      {/* Time column */}
                      <div className="w-16 flex-shrink-0">
                        {event.all_day ? (
                          <span className="text-xs text-muted-foreground">Dia todo</span>
                        ) : (
                          <>
                            <div className="text-sm font-medium">
                              {format(parseISO(event.start_at), "HH:mm")}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(parseISO(event.end_at), "HH:mm")}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Event details */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium group-hover:text-primary transition-colors">
                          {event.title}
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{event.location}</span>
                          </div>
                        )}
                        {event.description && (
                          <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {event.description}
                          </div>
                        )}
                      </div>

                      {/* Published indicator */}
                      {event.google_published_at && (
                        <div className="flex-shrink-0">
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                            Publicado
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
