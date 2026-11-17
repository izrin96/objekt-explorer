import type { CosmoErrorKind, TicketStatus } from "@repo/cosmo/session-parse";

/** The most Cosmo accounts one user keeps connected. */
export const MAX_COSMO_SESSIONS = 3;

/**
 * What `qrPoll` tells the browser, from one status read. Times are epoch milliseconds.
 * Anything but the two live statuses is `expired`, so a cancel or deny we never saw ends the
 * attempt instead of leaving it hanging. `certified` is neither: it returns null ("keep the last
 * state"), since a poll never carries the cookie and only certify ends the attempt, so a
 * successful sign-in is never shown as expired.
 */
export function pollState(status: TicketStatus, now: number) {
  if (status.status === "wait_for_user_action") {
    return status.ticketRemainingMs > 0
      ? ({ state: "waiting", expiresAt: now + status.ticketRemainingMs } as const)
      : ({ state: "expired" } as const);
  }
  if (status.status === "wait_for_certify") {
    return status.ticketRemainingMs > 0 && status.ticketOtpRemainingMs > 0
      ? ({
          state: "code",
          nickname: status.nickname,
          codeExpiresAt: now + status.ticketOtpRemainingMs,
        } as const)
      : ({ state: "expired" } as const);
  }
  if (status.status === "certified") return null;
  return { state: "expired" } as const;
}

/**
 * The answer a browser gets: the state plus the milliseconds left, so the dialog counts down on
 * its own clock from the moment the answer lands. The absolute times stay for the server's own
 * use (`last` in the ticket store); a viewer's clock may be minutes off the server's.
 */
export function withRemaining(state: PollState, now: number) {
  if (state.state === "waiting") {
    return { ...state, expiresInMs: Math.max(0, state.expiresAt - now) };
  }
  if (state.state === "code") {
    return { ...state, codeExpiresInMs: Math.max(0, state.codeExpiresAt - now) };
  }
  return state;
}

/**
 * A refusal means the code was wrong while its time remains and too late after. Anything else
 * is Cosmo's fault: after a timeout we cannot tell whether it made a session.
 */
export function certifyOutcome(kind: CosmoErrorKind, codeExpiresAt: number | null, now: number) {
  if (kind === "refused" || kind === "dead") {
    return codeExpiresAt !== null && codeExpiresAt > now ? "wrong_code" : "expired";
  }
  return "cosmo_error";
}

export function connectAllowed(
  existingAddresses: readonly string[],
  address: string,
  max = MAX_COSMO_SESSIONS,
) {
  const wanted = address.toLowerCase();
  return (
    existingAddresses.some((a) => a.toLowerCase() === wanted) || existingAddresses.length < max
  );
}

export type PollState = NonNullable<ReturnType<typeof pollState>>;

/** A stored session ends this long after connect, whatever Cosmo's own `Expires` says. */
export const MAX_COOKIE_AGE_MS = 180 * 24 * 60 * 60 * 1000;

/** The earlier of Cosmo's expiry and the max age; a missing or unusable Cosmo expiry is ignored. */
export function cookieExpiry(cosmoExpiresAt: Date | null, now: number) {
  const cap = now + MAX_COOKIE_AGE_MS;
  const cosmo = cosmoExpiresAt?.getTime();
  return new Date(cosmo === undefined || Number.isNaN(cosmo) ? cap : Math.min(cosmo, cap));
}

/**
 * What a poll answers without asking Cosmo (the site-wide limit is spent, or Cosmo is
 * unavailable): the last state the server saw while its own time has not run out, else expired.
 * Never `code` or `waiting` past their deadline, so a stale answer cannot outlive the ticket.
 */
export function pollFallback(
  last: PollState | null,
  ticketExpiresAt: number,
  now: number,
): PollState {
  if (ticketExpiresAt <= now) return { state: "expired" };
  if (!last) return { state: "waiting", expiresAt: ticketExpiresAt };
  if (last.state === "waiting") return last.expiresAt > now ? last : { state: "expired" };
  if (last.state === "code") return last.codeExpiresAt > now ? last : { state: "expired" };
  return last;
}

/** The refusal for a failed start: the token mint or Cosmo's ticket call. */
export function startRefusal(kind: CosmoErrorKind) {
  if (kind === "busy") return "cosmo_session_busy" as const;
  // a 4xx on the ticket call is Cosmo refusing the token (INVALID_RECAPTCHA)
  if (kind === "refused" || kind === "dead") return "cosmo_session_captcha" as const;
  return "cosmo_session_unavailable" as const;
}

/**
 * A user who may not connect: banned (a ban that has lapsed but was not yet cleared by the next
 * sign-in does not count) or scrubbed.
 */
export function connectBlocked(
  user: { banned: boolean | null; banExpires: Date | null; deletedAt: Date | null },
  now: number,
) {
  if (user.deletedAt) return true;
  return !!user.banned && (user.banExpires === null || user.banExpires.getTime() > now);
}

/** Only Cosmo's own refusal of a session that was already ended counts as confirmation of a logout. */
export function logoutConfirmed(result: { ok: true } | { ok: false; kind: CosmoErrorKind }) {
  return result.ok || result.kind === "dead";
}

/** Wrong codes one ticket accepts; the last one ends the attempt, so 100 codes cannot be tried. */
export const MAX_WRONG_CODES = 3;

/** The count after one more wrong code, and whether it ends the attempt. */
export function countWrongCode(ticket: { wrong?: number }, max = MAX_WRONG_CODES) {
  const wrong = (ticket.wrong ?? 0) + 1;
  return { wrong, over: wrong >= max };
}

/**
 * When a refused code stops being "wrong" and becomes "late". Before any poll saw the code step
 * the ticket's own expiry stands in, so a first wrong code is not read as expired.
 */
export function codeDeadline(last: PollState | null, ticketExpiresAt: number) {
  return last?.state === "code" ? last.codeExpiresAt : ticketExpiresAt;
}
