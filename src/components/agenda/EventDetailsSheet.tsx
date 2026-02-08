import * as React from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  MapPin,
  Clock,
  Calendar as CalendarIcon,
  Copy,
  Pencil,
  Trash2,
  ExternalLink,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import type { CalendarEvent } from "@/hooks/use-calendar-events";
import { useMarkAsPublished } from "@/hooks/use-calendar-events";
import { openGoogleCalendar } from "@/lib/calendarUtils";

interface EventDetailsSheetProps {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  isOwner: boolean;
}

export function EventDetailsSheet({
  event,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onDuplicate,
  isOwner,
}: EventDetailsSheetProps) {
  const markAsPublished = useMarkAsPublished();

  if (!event) return null;

  const handlePublishToGoogle = () => {
    openGoogleCalendar({
      title: event.title,
      description: event.description || undefined,
      location: event.location || undefined,
      start_at: event.start_at,
      end_at: event.end_at,
      all_day: event.all_day,
      timezone: event.timezone,
    });
  };

  const handleMarkAsPublished = () => {
    markAsPublished.mutate(event.id);
  };

  const handleCopyLink = () => {
    if (event.google_publish_url) {
      navigator.clipboard.writeText(event.google_publish_url);
      toast.success("Link copiado!");
    }
  };

  const formatDateRange = () => {
    const start = parseISO(event.start_at);
    const end = parseISO(event.end_at);

    if (event.all_day) {
      return format(start, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
    }

    const sameDay = format(start, "yyyy-MM-dd") === format(end, "yyyy-MM-dd");

    if (sameDay) {
      return `${format(start, "EEEE, d 'de' MMMM", { locale: ptBR })} · ${format(
        start,
        "HH:mm"
      )} - ${format(end, "HH:mm")}`;
    }

    return `${format(start, "d MMM HH:mm", { locale: ptBR })} - ${format(
      end,
      "d MMM HH:mm",
      { locale: ptBR }
    )}`;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader className="pb-4">
          <div className="flex items-start justify-between">
            <SheetTitle className="text-xl font-semibold pr-8">
              {event.title}
            </SheetTitle>
          </div>
        </SheetHeader>

        <div className="space-y-4">
          {/* Date and time */}
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm capitalize">{formatDateRange()}</p>
              {event.all_day && (
                <p className="text-xs text-muted-foreground">Dia inteiro</p>
              )}
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <p className="text-sm">{event.location}</p>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="pt-2">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {event.description}
              </p>
            </div>
          )}

          {/* Published status */}
          {event.google_published_at && (
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-primary" />
              <span className="text-primary">
                Publicado em{" "}
                {format(parseISO(event.google_published_at), "dd/MM/yyyy 'às' HH:mm")}
              </span>
            </div>
          )}

          <Separator />

          {/* Google Calendar actions */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Google Agenda
            </p>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handlePublishToGoogle}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Publicar no Google Agenda
            </Button>
            {!event.google_published_at && (
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={handleMarkAsPublished}
                disabled={markAsPublished.isPending}
              >
                <Check className="h-4 w-4 mr-2" />
                Marcar como publicado
              </Button>
            )}
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={handleCopyLink}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copiar link do evento
            </Button>
          </div>

          <Separator />

          {/* Event actions */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Ações
            </p>
            {isOwner && (
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={onEdit}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Editar evento
              </Button>
            )}
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={onDuplicate}
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Duplicar evento
            </Button>
            {isOwner && (
              <Button
                variant="ghost"
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir evento
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
