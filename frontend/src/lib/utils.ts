import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(name?: string) {
  if (!name) return "AF";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function getErrorMessage(error: unknown, fallback = "Something went wrong. Please try again.") {
  if (typeof error === "object" && error !== null) {
    const candidate = error as {
      response?: { data?: { message?: string; error?: string | { message?: string } } };
      message?: string;
    };
    const apiError = candidate.response?.data?.error;
    return candidate.response?.data?.message
      ?? (typeof apiError === "string" ? apiError : apiError?.message)
      ?? candidate.message
      ?? fallback;
  }
  return fallback;
}

export function unwrapList<T>(payload: unknown, keys: string[]): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (typeof payload !== "object" || payload === null) return [];
  const record = payload as Record<string, unknown>;
  if (Array.isArray(record.data)) return record.data as T[];
  for (const key of keys) {
    if (Array.isArray(record[key])) return record[key] as T[];
    if (typeof record.data === "object" && record.data !== null) {
      const nested = (record.data as Record<string, unknown>)[key];
      if (Array.isArray(nested)) return nested as T[];
    }
  }
  return [];
}
