import type { ChatRefusal, ConversationRow } from "@repo/api/schemas/chat";
import { CHAT_REFUSALS } from "@repo/api/schemas/chat";
import { normalizeCurrency } from "@repo/lib/currency";

import { formatCurrency } from "@/features/settings/use-currency";
import { errorReason } from "@/lib/orpc-error";
import { relativeTime } from "@/lib/time";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

export function mutedLabel(muted: NonNullable<ConversationRow["muted"]>) {
  if (muted.until === null) return m.chat_muted_always();
  return m.chat_muted_until({ time: untilLabel(muted.until) });
}

const untilFormats = new Map<string, Intl.DateTimeFormat>();
const timeFormats = new Map<string, Intl.DateTimeFormat>();
const dayFormats = new Map<string, Intl.DateTimeFormat>();
const secondFormats = new Map<string, Intl.RelativeTimeFormat>();

function cached<T>(cache: Map<string, T>, locale: string, build: () => T): T {
  let formatter = cache.get(locale);
  if (formatter === undefined) {
    formatter = build();
    cache.set(locale, formatter);
  }
  return formatter;
}

/** A date and time in the viewer's zone, for an end that may be days away. */
export function untilLabel(iso: string) {
  const locale = getLocale();
  return cached(
    untilFormats,
    locale,
    () => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }),
  ).format(new Date(iso));
}

export function messageTime(iso: string) {
  const locale = getLocale();
  return cached(
    timeFormats,
    locale,
    () => new Intl.DateTimeFormat(locale, { timeStyle: "short" }),
  ).format(new Date(iso));
}

export function dayLabel(iso: string) {
  const locale = getLocale();
  return cached(
    dayFormats,
    locale,
    () => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }),
  ).format(new Date(iso));
}

export function refusalOf(error: unknown) {
  const { reason: code, retryAt } = errorReason(error);
  const reason = CHAT_REFUSALS.find((item) => item === code);
  return reason ? { reason, retryAt } : null;
}

export function refusalText(refusal: { reason: ChatRefusal; retryAt: string | null }) {
  const now = Date.now();
  const at = refusal.retryAt ? new Date(refusal.retryAt).getTime() : now;
  // the message limit resets within the minute, which `relativeTime` would call "now"
  const seconds = Math.ceil((at - now) / 1000);
  const locale = getLocale();
  const wait =
    seconds > 0 && seconds < 60
      ? cached(
          secondFormats,
          locale,
          () => new Intl.RelativeTimeFormat(locale, { numeric: "auto" }),
        ).format(seconds, "second")
      : relativeTime(at, now, "hour");
  switch (refusal.reason) {
    case "no_address":
      return m.chat_refused_no_address();
    case "self":
      return m.chat_refused_self();
    case "not_accepting":
      return m.chat_refused_not_accepting();
    case "message_limit":
      return m.chat_refused_message_limit({ time: wait });
    case "settings_limit":
      return m.chat_refused_settings_limit({ time: wait });
    case "invalid_card":
      return m.chat_refused_invalid_card();
    case "unsend_closed":
      return m.chat_refused_unsend_closed();
    case "invalid_reply":
      return m.chat_refused_invalid_reply();
    case "muted":
      return refusal.retryAt
        ? m.chat_refused_muted({ time: untilLabel(refusal.retryAt) })
        : m.chat_refused_muted_always();
  }
}

const wholeFormats = new Map<string, Intl.NumberFormat>();

/**
 * A post's price range in its own currency. Cents are dropped only when both ends are whole, so
 * the two format alike.
 */
export function formatPostPrices(min: number, max: number, code: string) {
  const exact = { min: formatCurrency(min, code), max: formatCurrency(max, code) };
  if (!Number.isInteger(min) || !Number.isInteger(max)) return exact;
  const currency = normalizeCurrency(code);
  const locale = getLocale();
  try {
    const format = cached(
      wholeFormats,
      `${locale}|${currency}`,
      () =>
        new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }),
    );
    return { min: format.format(min), max: format.format(max) };
  } catch {
    return exact;
  }
}
