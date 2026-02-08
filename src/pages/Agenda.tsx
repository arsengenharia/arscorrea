import * as React from "react";
import {
  format,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Layout } from "@/components/layout/Layout";
import { MiniCalendar } from "@/components/agenda/MiniCalendar";
import { MonthView } from "@/components/agenda/MonthView";
import { WeekView } from "@/components/agenda/WeekView";
import { DayView } from "@/components/agenda/DayView";
import { AgendaView } from "@/components/agenda/AgendaView";
import { EventFormSheet } from "@/components/agenda/EventFormSheet";
import { EventDetailsSheet } from "@/components/agenda/EventDetailsSheet";
import {
  useCalendarEvents,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
  type CalendarEvent,
  type CreateEventData,
} from "@/hooks/use-calendar-events";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ViewMode = "month" | "week" | "day" | "agenda";

export default function Agenda() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [viewMode, setViewMode] = React.useState<ViewMode>("month");
  
  // Form sheet state
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingEvent, setEditingEvent] = React.useState<CalendarEvent | null>(null);
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>();
  const [selectedHour, setSelectedHour] = React.useState<number | undefined>();
  
  // Details sheet state
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [selectedEvent, setSelectedEvent] = React.useState<CalendarEvent | null>(null);
  
  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

  // Calculate date range for query based on view
  const getDateRange = () => {
    switch (viewMode) {
      case "month":
        return {
          start: startOfWeek(startOfMonth(currentDate)),
          end: endOfWeek(endOfMonth(currentDate)),
        };
      case "week":
        return {
          start: startOfWeek(currentDate),
          end: endOfWeek(currentDate),
        };
      case "day":
        return {
          start: startOfWeek(currentDate),
          end: endOfWeek(currentDate),
        };
      case "agenda":
        return {
          start: new Date(),
          end: addMonths(new Date(), 3),
        };
      default:
        return { start: undefined, end: undefined };
    }
  };

  const { start, end } = getDateRange();
  const { data: events = [], isLoading } = useCalendarEvents(start, end);
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();

  // Navigation
  const goToToday = () => setCurrentDate(new Date());

  const goToPrevious = () => {
    switch (viewMode) {
      case "month":
        setCurrentDate(subMonths(currentDate, 1));
        break;
      case "week":
        setCurrentDate(subWeeks(currentDate, 1));
        break;
      case "day":
      case "agenda":
        setCurrentDate(subDays(currentDate, 1));
        break;
    }
  };

  const goToNext = () => {
    switch (viewMode) {
      case "month":
        setCurrentDate(addMonths(currentDate, 1));
        break;
      case "week":
        setCurrentDate(addWeeks(currentDate, 1));
        break;
      case "day":
      case "agenda":
        setCurrentDate(addDays(currentDate, 1));
        break;
    }
  };

  const getHeaderTitle = () => {
    switch (viewMode) {
      case "month":
        return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
      case "week":
        const weekStart = startOfWeek(currentDate);
        const weekEnd = endOfWeek(currentDate);
        return `${format(weekStart, "d MMM", { locale: ptBR })} - ${format(weekEnd, "d MMM yyyy", { locale: ptBR })}`;
      case "day":
        return format(currentDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR });
      case "agenda":
        return "Próximos Eventos";
      default:
        return "";
    }
  };

  // Event handlers
  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setDetailsOpen(true);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setSelectedHour(9);
    setEditingEvent(null);
    setFormOpen(true);
  };

  const handleTimeSlotClick = (date: Date, hour: number) => {
    setSelectedDate(date);
    setSelectedHour(hour);
    setEditingEvent(null);
    setFormOpen(true);
  };

  const handleCreateClick = () => {
    setSelectedDate(new Date());
    setSelectedHour(undefined);
    setEditingEvent(null);
    setFormOpen(true);
  };

  const handleFormSubmit = async (data: CreateEventData) => {
    if (editingEvent) {
      await updateEvent.mutateAsync({ ...data, id: editingEvent.id });
    } else {
      await createEvent.mutateAsync(data);
    }
    setFormOpen(false);
    setEditingEvent(null);
  };

  const handleEdit = () => {
    setEditingEvent(selectedEvent);
    setDetailsOpen(false);
    setFormOpen(true);
  };

  const handleDuplicate = () => {
    if (selectedEvent) {
      setEditingEvent(null);
      setSelectedDate(new Date());
      setFormOpen(true);
      setDetailsOpen(false);
      // Pre-fill with selected event data (without id)
      setTimeout(() => {
        setEditingEvent({
          ...selectedEvent,
          id: "", // Clear ID so it creates new
          title: `${selectedEvent.title} (cópia)`,
        } as CalendarEvent);
      }, 100);
    }
  };

  const handleDeleteConfirm = async () => {
    if (selectedEvent) {
      await deleteEvent.mutateAsync(selectedEvent.id);
      setDeleteDialogOpen(false);
      setDetailsOpen(false);
      setSelectedEvent(null);
    }
  };

  const isOwner = selectedEvent?.created_by === user?.id;

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-4">
            <Button onClick={handleCreateClick} className="gap-2">
              <Plus className="h-4 w-4" />
              Criar
            </Button>
            <Button variant="outline" onClick={goToToday}>
              Hoje
            </Button>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={goToPrevious}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={goToNext}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
            <h1 className="text-xl font-semibold capitalize">{getHeaderTitle()}</h1>
          </div>
          <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Mês</SelectItem>
              <SelectItem value="week">Semana</SelectItem>
              <SelectItem value="day">Dia</SelectItem>
              <SelectItem value="agenda">Agenda</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Main content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - hidden on mobile */}
          <div className="hidden md:block w-64 border-r p-4 space-y-4">
            <Button onClick={handleCreateClick} className="w-full gap-2">
              <Plus className="h-4 w-4" />
              Criar
            </Button>
            <MiniCalendar
              selectedDate={currentDate}
              onDateSelect={(date) => {
                setCurrentDate(date);
                if (viewMode === "month") setViewMode("day");
              }}
            />
          </div>

          {/* Calendar view */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-muted-foreground">Carregando...</div>
              </div>
            ) : (
              <>
                {viewMode === "month" && (
                  <MonthView
                    currentDate={currentDate}
                    events={events}
                    onEventClick={handleEventClick}
                    onDateClick={handleDateClick}
                  />
                )}
                {viewMode === "week" && (
                  <WeekView
                    currentDate={currentDate}
                    events={events}
                    onEventClick={handleEventClick}
                    onTimeSlotClick={handleTimeSlotClick}
                  />
                )}
                {viewMode === "day" && (
                  <DayView
                    currentDate={currentDate}
                    events={events}
                    onEventClick={handleEventClick}
                    onTimeSlotClick={handleTimeSlotClick}
                  />
                )}
                {viewMode === "agenda" && (
                  <AgendaView
                    currentDate={currentDate}
                    events={events}
                    onEventClick={handleEventClick}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* Event form sheet */}
        <EventFormSheet
          open={formOpen}
          onOpenChange={setFormOpen}
          initialData={editingEvent || undefined}
          initialDate={selectedDate}
          initialHour={selectedHour}
          onSubmit={handleFormSubmit}
          isEditing={!!editingEvent?.id}
        />

        {/* Event details sheet */}
        <EventDetailsSheet
          event={selectedEvent}
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          onEdit={handleEdit}
          onDelete={() => setDeleteDialogOpen(true)}
          onDuplicate={handleDuplicate}
          isOwner={isOwner}
        />

        {/* Delete confirmation dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir evento?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. O evento será permanentemente excluído.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
