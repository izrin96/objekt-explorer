import type { Notification } from "@repo/api/schemas/notification";
import { TRADE_EXPIRE_DAYS } from "@repo/api/schemas/offer";

export const SECTIONS = ["needs-you", "today", "week", "earlier"] as const;
export type Section = (typeof SECTIONS)[number];

export type RowAction = "send" | "review" | "feedback" | "matches";

const DAY_MS = 24 * 60 * 60 * 1000;

/** What a row offers to do next, if anything; it leads where the row does. */
export function rowAction(item: Notification): RowAction | null {
  switch (item.type) {
    case "want_match":
    case "have_wanted":
      return "matches";
    case "offer":
      return item.payload.event === "received" || item.payload.event === "countered"
        ? "review"
        : null;
    case "trade":
      if (item.payload.event === "reminder") return "send";
      if (item.payload.event === "completed") return "feedback";
      return null;
    default:
      return null;
  }
}

/**
 * Only the party who must act gets a reminder or a copy coming due, and any later event on the
 * trade becomes the row's head. With trade notes off no later event is written, so then nothing
 * counts; nor does one older than a trade can stay open. A stuck objekt goes to both parties, so
 * it never counts.
 */
export function needsYou(item: Notification, tradeNotes: boolean, now: number) {
  return (
    tradeNotes &&
    item.type === "trade" &&
    (item.payload.event === "reminder" || item.payload.event === "wrong_copy_due") &&
    now - Date.parse(item.createdAt) < TRADE_EXPIRE_DAYS * DAY_MS
  );
}

export function sectionOf(item: Notification, tradeNotes: boolean, now: number): Section {
  if (needsYou(item, tradeNotes, now)) return "needs-you";
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const at = Date.parse(item.createdAt);
  if (at >= today.getTime()) return "today";
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - 7);
  return at >= weekStart.getTime() ? "week" : "earlier";
}
