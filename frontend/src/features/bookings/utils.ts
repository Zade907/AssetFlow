import type { BookingStatus } from "./api";

const DATE_LONG = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

const TIME_ONLY = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

const DATE_ONLY = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  day: "numeric",
  month: "long",
});

export function formatDateTime(iso: string) {
  return DATE_LONG.format(new Date(iso));
}

export function formatTimeRange(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();
  return sameDay
    ? `${DATE_ONLY.format(start)} · ${TIME_ONLY.format(start)} – ${TIME_ONLY.format(end)}`
    : `${DATE_LONG.format(start)} → ${DATE_LONG.format(end)}`;
}

// datetime-local inputs use the user's local timezone in the form YYYY-MM-DDTHH:MM.
export function toDatetimeLocalValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function datetimeLocalValueToIso(value: string) {
  if (!value) return "";
  return new Date(value).toISOString();
}

export function nextHour() {
  const date = new Date();
  date.setMinutes(0, 0, 0);
  date.setHours(date.getHours() + 1);
  return date;
}

export function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export const bookingStatusTone: Record<BookingStatus, "info" | "success" | "neutral" | "danger"> = {
  UPCOMING: "info",
  ONGOING: "success",
  COMPLETED: "neutral",
  CANCELLED: "danger",
};

export const bookingStatusLabel: Record<BookingStatus, string> = {
  UPCOMING: "Upcoming",
  ONGOING: "Ongoing",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};
