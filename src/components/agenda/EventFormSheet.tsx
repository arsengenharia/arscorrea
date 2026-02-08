import * as React from "react";
import { format, parseISO, setHours, setMinutes, addHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Clock, MapPin, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { CreateEventData } from "@/hooks/use-calendar-events";

interface EventFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Partial<CreateEventData> & { id?: string };
  initialDate?: Date;
  initialHour?: number;
  onSubmit: (data: CreateEventData) => void;
  onDelete?: () => void;
  isEditing?: boolean;
}

export function EventFormSheet({
  open,
  onOpenChange,
  initialData,
  initialDate,
  initialHour,
  onSubmit,
  onDelete,
  isEditing = false,
}: EventFormSheetProps) {
  const getDefaultStartDate = () => {
    if (initialData?.start_at) return parseISO(initialData.start_at);
    if (initialDate && initialHour !== undefined) {
      return setMinutes(setHours(initialDate, initialHour), 0);
    }
    if (initialDate) return setHours(initialDate, 9);
    return setMinutes(setHours(new Date(), new Date().getHours() + 1), 0);
  };

  const getDefaultEndDate = () => {
    if (initialData?.end_at) return parseISO(initialData.end_at);
    return addHours(getDefaultStartDate(), 1);
  };

  const [title, setTitle] = React.useState(initialData?.title || "");
  const [description, setDescription] = React.useState(initialData?.description || "");
  const [location, setLocation] = React.useState(initialData?.location || "");
  const [startDate, setStartDate] = React.useState<Date>(getDefaultStartDate());
  const [endDate, setEndDate] = React.useState<Date>(getDefaultEndDate());
  const [allDay, setAllDay] = React.useState(initialData?.all_day || false);
  const [startTime, setStartTime] = React.useState(format(getDefaultStartDate(), "HH:mm"));
  const [endTime, setEndTime] = React.useState(format(getDefaultEndDate(), "HH:mm"));

  // Reset form when opening/closing or when initialData changes
  React.useEffect(() => {
    if (open) {
      setTitle(initialData?.title || "");
      setDescription(initialData?.description || "");
      setLocation(initialData?.location || "");
      const start = getDefaultStartDate();
      const end = getDefaultEndDate();
      setStartDate(start);
      setEndDate(end);
      setStartTime(format(start, "HH:mm"));
      setEndTime(format(end, "HH:mm"));
      setAllDay(initialData?.all_day || false);
    }
  }, [open, initialData, initialDate, initialHour]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) return;

    // Combine date and time
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);

    const finalStartDate = allDay
      ? setHours(setMinutes(startDate, 0), 0)
      : setMinutes(setHours(startDate, startH), startM);

    const finalEndDate = allDay
      ? setHours(setMinutes(endDate, 59), 23)
      : setMinutes(setHours(endDate, endH), endM);

    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      start_at: finalStartDate.toISOString(),
      end_at: finalEndDate.toISOString(),
      all_day: allDay,
      timezone: "America/Sao_Paulo",
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Editar Evento" : "Novo Evento"}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {/* Title */}
          <div>
            <Input
              placeholder="Adicionar título"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xl font-medium border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
              required
            />
          </div>

          {/* Date and Time */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Dia inteiro
              </Label>
              <Switch checked={allDay} onCheckedChange={setAllDay} />
            </div>

            {/* Start Date/Time */}
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex-1 justify-start">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {format(startDate, "dd/MM/yyyy", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {!allDay && (
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-28"
                />
              )}
            </div>

            {/* End Date/Time */}
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex-1 justify-start">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {format(endDate, "dd/MM/yyyy", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => date && setEndDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {!allDay && (
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-28"
                />
              )}
            </div>
          </div>

          {/* Location */}
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4" />
              Local
            </Label>
            <Input
              placeholder="Adicionar local"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            <Label className="mb-2 block">Descrição</Label>
            <Textarea
              placeholder="Adicionar descrição"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* TODO: Attendees multi-select would go here */}
          {/* For now, we skip attendees since we don't have a profiles table */}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1">
              {isEditing ? "Salvar" : "Criar"}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>

          {isEditing && onDelete && (
            <Button
              type="button"
              variant="destructive"
              className="w-full"
              onClick={onDelete}
            >
              Excluir Evento
            </Button>
          )}
        </form>
      </SheetContent>
    </Sheet>
  );
}
