import type { ChatRefusal, ConversationRow } from "@repo/api/schemas/chat";
import { CHAT_REFUSALS } from "@repo/api/schemas/chat";

import { errorReason } from "@/lib/orpc-error";
import { relativeTime } from "@/lib/time";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

export function mutedLabel(muted: NonNullable<ConversationRow["muted"]>) {
  if (muted.until === null) return m.chat_muted_always();
  return m.chat_muted_until({ time: untilLabel(muted.until) });
}

/** A date and time in the viewer's zone, for an end that may be days away. */
export function untilLabel(iso: string) {
  return new Intl.DateTimeFormat(getLocale(), { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(iso),
  );
}

export function messageTime(iso: string) {
  return new Intl.DateTimeFormat(getLocale(), { timeStyle: "short" }).format(new Date(iso));
}

export function dayLabel(iso: string) {
  return new Intl.DateTimeFormat(getLocale(), { dateStyle: "medium" }).format(new Date(iso));
}

export function refusalOf(error: unknown) {
  const { reason: code, retryAt } = errorReason(error);
  const reason = CHAT_REFUSALS.find((item) => item === code);
  return reason ? { reason, retryAt } : null;
}

/** Reads the clock here: the compiler takes `Date.now` in a component body as a render-time call. */
export function refusalText(refusal: { reason: ChatRefusal; retryAt: string | null }) {
  const now = Date.now();
  const at = refusal.retryAt ? new Date(refusal.retryAt).getTime() : now;
  // the message limit resets within the minute, which `relativeTime` would call "now"
  const seconds = Math.ceil((at - now) / 1000);
  const wait =
    seconds > 0 && seconds < 60
      ? new Intl.RelativeTimeFormat(getLocale(), { numeric: "auto" }).format(seconds, "second")
      : relativeTime(at, now, "hour");
  switch (refusal.reason) {
    case "no_address":
      return m.chat_refused_no_address();
    case "self":
      return m.chat_refused_self();
    case "not_accepting":
      return m.chat_refused_not_accepting();
    case "start_limit":
      return m.chat_refused_start_limit({ time: wait });
    case "message_limit":
      return m.chat_refused_message_limit({ time: wait });
    case "invalid_card":
      return m.chat_refused_invalid_card();
    case "unsend_closed":
      return m.chat_refused_unsend_closed();
    case "muted":
      return refusal.retryAt
        ? m.chat_refused_muted({ time: untilLabel(refusal.retryAt) })
        : m.chat_refused_muted_always();
  }
}
