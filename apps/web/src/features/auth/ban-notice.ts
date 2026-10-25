import { parseBanNotice } from "@repo/api/schemas/moderation";

import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

export const BANNED = "BANNED_USER";

/**
 * Better Auth checks a ban only after the password or the provider's consent, so this message
 * reaches only someone who already proved the account is theirs.
 */
export function banText(message: string | undefined) {
  const notice = parseBanNotice(message);
  if (!notice) return m.auth_banned();
  if (!notice.until) return m.auth_banned_forever({ reason: notice.reason });
  const end = new Date(notice.until);
  // Intl throws on an invalid date; the generic notice still says why sign-in failed
  if (Number.isNaN(end.getTime())) return m.auth_banned();
  const until = new Intl.DateTimeFormat(getLocale(), { dateStyle: "long" }).format(end);
  return m.auth_banned_until({ until, reason: notice.reason });
}

/** Marks an error whose message is already the whole sentence to show. */
export function bannedError(message: string | undefined) {
  return Object.assign(new Error(banText(message)), { name: BANNED });
}
