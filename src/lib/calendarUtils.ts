import { format, parseISO } from "date-fns";

export interface CalendarEventData {
  title: string;
  description?: string;
  location?: string;
  start_at: string;
  end_at: string;
  all_day?: boolean;
  timezone?: string;
  attendeeEmails?: string[];
}

/**
 * Generates a Google Calendar URL for creating a pre-filled event
 * @see https://github.com/nicholasok/google-calendar-url
 */
export function generateGoogleCalendarUrl(event: CalendarEventData): string {
  const baseUrl = "https://calendar.google.com/calendar/render";
  const params = new URLSearchParams();

  params.set("action", "TEMPLATE");
  params.set("text", event.title);

  // Format dates for Google Calendar
  // All-day events use YYYYMMDD format, timed events use YYYYMMDDTHHMMSS format
  const startDate = parseISO(event.start_at);
  const endDate = parseISO(event.end_at);

  if (event.all_day) {
    params.set("dates", `${format(startDate, "yyyyMMdd")}/${format(endDate, "yyyyMMdd")}`);
  } else {
    // Convert to UTC for Google Calendar
    const startUtc = format(startDate, "yyyyMMdd'T'HHmmss'Z'");
    const endUtc = format(endDate, "yyyyMMdd'T'HHmmss'Z'");
    params.set("dates", `${startUtc}/${endUtc}`);
  }

  if (event.description) {
    params.set("details", event.description);
  }

  if (event.location) {
    params.set("location", event.location);
  }

  // Add attendees (comma-separated emails)
  if (event.attendeeEmails && event.attendeeEmails.length > 0) {
    params.set("add", event.attendeeEmails.join(","));
  }

  // Set timezone
  if (event.timezone) {
    params.set("ctz", event.timezone);
  }

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Opens Google Calendar with a pre-filled event in a new tab
 */
export function openGoogleCalendar(event: CalendarEventData): void {
  const url = generateGoogleCalendarUrl(event);
  window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * Event status options
 */
export const EVENT_ATTENDEE_STATUSES = [
  { value: "invited", label: "Convidado" },
  { value: "accepted", label: "Aceito" },
  { value: "declined", label: "Recusado" },
] as const;

export type AttendeeStatus = typeof EVENT_ATTENDEE_STATUSES[number]["value"];
