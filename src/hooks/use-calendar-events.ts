import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { generateGoogleCalendarUrl } from "@/lib/calendarUtils";

export interface CalendarEvent {
  id: string;
  created_by: string;
  title: string;
  description: string | null;
  location: string | null;
  start_at: string;
  end_at: string;
  all_day: boolean;
  timezone: string;
  google_publish_url: string | null;
  google_published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarEventAttendee {
  id: string;
  event_id: string;
  user_id: string;
  role: "owner" | "attendee";
  status: "invited" | "accepted" | "declined";
  created_at: string;
  user_email?: string;
}

export interface CreateEventData {
  title: string;
  description?: string;
  location?: string;
  start_at: string;
  end_at: string;
  all_day?: boolean;
  timezone?: string;
  attendee_ids?: string[];
}

export interface UpdateEventData extends Partial<CreateEventData> {
  id: string;
}

export function useCalendarEvents(startDate?: Date, endDate?: Date) {
  return useQuery({
    queryKey: ["calendar-events", startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from("calendar_events")
        .select("*")
        .order("start_at", { ascending: true });

      if (startDate) {
        query = query.gte("start_at", startDate.toISOString());
      }
      if (endDate) {
        query = query.lte("start_at", endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as CalendarEvent[];
    },
  });
}

export function useCalendarEvent(eventId: string | undefined) {
  return useQuery({
    queryKey: ["calendar-event", eventId],
    queryFn: async () => {
      if (!eventId) return null;

      const { data, error } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("id", eventId)
        .single();

      if (error) throw error;
      return data as CalendarEvent;
    },
    enabled: !!eventId,
  });
}

export function useEventAttendees(eventId: string | undefined) {
  return useQuery({
    queryKey: ["calendar-event-attendees", eventId],
    queryFn: async () => {
      if (!eventId) return [];

      const { data, error } = await supabase
        .from("calendar_event_attendees")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as CalendarEventAttendee[];
    },
    enabled: !!eventId,
  });
}

export function useMyInvites() {
  return useQuery({
    queryKey: ["my-calendar-invites"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("calendar_event_attendees")
        .select(`
          *,
          calendar_events (*)
        `)
        .eq("user_id", user.id)
        .eq("role", "attendee")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateEventData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Fetch attendee emails for Google Calendar URL
      let attendeeEmails: string[] = [];
      if (data.attendee_ids && data.attendee_ids.length > 0) {
        const { data: users } = await supabase.auth.admin?.listUsers?.() || { data: null };
        // Since we can't access auth.users directly, we'll handle emails differently
        // For now, we'll generate the URL without emails and update if we have a profiles table
      }

      // Generate Google Calendar URL
      const googleUrl = generateGoogleCalendarUrl({
        title: data.title,
        description: data.description,
        location: data.location,
        start_at: data.start_at,
        end_at: data.end_at,
        all_day: data.all_day,
        timezone: data.timezone || "America/Sao_Paulo",
        attendeeEmails,
      });

      // Create event
      const { data: event, error: eventError } = await supabase
        .from("calendar_events")
        .insert({
          created_by: user.id,
          title: data.title,
          description: data.description || null,
          location: data.location || null,
          start_at: data.start_at,
          end_at: data.end_at,
          all_day: data.all_day || false,
          timezone: data.timezone || "America/Sao_Paulo",
          google_publish_url: googleUrl,
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Add creator as owner
      await supabase
        .from("calendar_event_attendees")
        .insert({
          event_id: event.id,
          user_id: user.id,
          role: "owner",
          status: "accepted",
        });

      // Add other attendees
      if (data.attendee_ids && data.attendee_ids.length > 0) {
        const attendees = data.attendee_ids
          .filter(id => id !== user.id)
          .map(user_id => ({
            event_id: event.id,
            user_id,
            role: "attendee" as const,
            status: "invited" as const,
          }));

        if (attendees.length > 0) {
          const { error: attendeesError } = await supabase
            .from("calendar_event_attendees")
            .insert(attendees);

          if (attendeesError) throw attendeesError;
        }
      }

      return event as CalendarEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      toast.success("Evento criado com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating event:", error);
      toast.error("Erro ao criar evento");
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateEventData) => {
      const { id, attendee_ids, ...updateData } = data;

      // Regenerate Google Calendar URL if relevant fields changed
      if (updateData.title || updateData.start_at || updateData.end_at) {
        const { data: currentEvent } = await supabase
          .from("calendar_events")
          .select("*")
          .eq("id", id)
          .single();

        if (currentEvent) {
          const googleUrl = generateGoogleCalendarUrl({
            title: updateData.title || currentEvent.title,
            description: updateData.description ?? currentEvent.description ?? undefined,
            location: updateData.location ?? currentEvent.location ?? undefined,
            start_at: updateData.start_at || currentEvent.start_at,
            end_at: updateData.end_at || currentEvent.end_at,
            all_day: updateData.all_day ?? currentEvent.all_day,
            timezone: updateData.timezone || currentEvent.timezone,
          });
          (updateData as any).google_publish_url = googleUrl;
        }
      }

      const { data: event, error } = await supabase
        .from("calendar_events")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Update attendees if provided
      if (attendee_ids !== undefined) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado");

        // Get current attendees
        const { data: currentAttendees } = await supabase
          .from("calendar_event_attendees")
          .select("user_id")
          .eq("event_id", id);

        const currentIds = currentAttendees?.map(a => a.user_id) || [];
        const newIds = attendee_ids.filter(aid => aid !== user.id);

        // Remove attendees not in new list (except owner)
        const toRemove = currentIds.filter(cid => cid !== user.id && !newIds.includes(cid));
        if (toRemove.length > 0) {
          await supabase
            .from("calendar_event_attendees")
            .delete()
            .eq("event_id", id)
            .in("user_id", toRemove);
        }

        // Add new attendees
        const toAdd = newIds.filter(nid => !currentIds.includes(nid));
        if (toAdd.length > 0) {
          await supabase
            .from("calendar_event_attendees")
            .insert(toAdd.map(user_id => ({
              event_id: id,
              user_id,
              role: "attendee" as const,
              status: "invited" as const,
            })));
        }
      }

      return event as CalendarEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-event"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-event-attendees"] });
      toast.success("Evento atualizado com sucesso!");
    },
    onError: (error) => {
      console.error("Error updating event:", error);
      toast.error("Erro ao atualizar evento");
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from("calendar_events")
        .delete()
        .eq("id", eventId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      toast.success("Evento excluído com sucesso!");
    },
    onError: (error) => {
      console.error("Error deleting event:", error);
      toast.error("Erro ao excluir evento");
    },
  });
}

export function useUpdateAttendeeStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ attendeeId, status }: { attendeeId: string; status: "accepted" | "declined" }) => {
      const { error } = await supabase
        .from("calendar_event_attendees")
        .update({ status })
        .eq("id", attendeeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-event-attendees"] });
      queryClient.invalidateQueries({ queryKey: ["my-calendar-invites"] });
      toast.success("Status atualizado!");
    },
    onError: (error) => {
      console.error("Error updating attendee status:", error);
      toast.error("Erro ao atualizar status");
    },
  });
}

export function useMarkAsPublished() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from("calendar_events")
        .update({ google_published_at: new Date().toISOString() })
        .eq("id", eventId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-event"] });
      toast.success("Marcado como publicado!");
    },
    onError: (error) => {
      console.error("Error marking as published:", error);
      toast.error("Erro ao marcar como publicado");
    },
  });
}
