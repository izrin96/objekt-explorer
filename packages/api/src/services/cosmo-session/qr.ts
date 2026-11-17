import { certifyLoginTicket, createLoginTicket, readLoginTicket } from "@repo/cosmo/server/qr-auth";
import { mintRecaptchaToken } from "@repo/cosmo/server/recaptcha";
import { fetchSessionUser } from "@repo/cosmo/server/session";
import { CosmoSessionError } from "@repo/cosmo/server/shop";
import type { CosmoErrorKind } from "@repo/cosmo/session-parse";
import { db } from "@repo/db";
import { cosmoSession, notification, user } from "@repo/db/schema";
import { seal, sessionAad } from "@repo/lib/server/sealed";
import { and, eq, isNull, like, sql } from "drizzle-orm";

import { serverEnv } from "../../env";
import {
  certifyOutcome,
  codeDeadline,
  connectAllowed,
  connectBlocked,
  cookieExpiry,
  pollFallback,
  pollState,
  startRefusal,
  type PollState,
  withRemaining,
} from "../../lib/cosmo-qr";
import { refuse } from "../../lib/refuse";
import { publishNotify } from "../../realtime";
import type { CosmoSessionRefusal } from "../../schemas/cosmo-session";
import { globalRateLimited, ipRateLimited, userRateLimited } from "../redis";
import { refuseSession } from "./refusal";
import { sessionsAvailable, signOutCookies, signOutSealed, type SealedSession } from "./sessions";
import { clearTicket, readTicket, recordWrongCode, rememberState, storeTicket } from "./ticket";

const kindOf = (err: unknown): CosmoErrorKind =>
  err instanceof CosmoSessionError ? err.kind : "unavailable";

function refuseRateLimit(): never {
  return refuse("TOO_MANY_REQUESTS", "user_rate_limit", "Too many requests, try again shortly");
}

/** The caller's limits first, so a caller over their own cannot drain the site-wide budget. */
async function refuseOverLimits(
  perCaller: (() => Promise<boolean>)[],
  global: () => Promise<boolean>,
) {
  for (const check of perCaller) {
    if (await check()) refuseRateLimit();
  }
  if (await global()) refuseRateLimit();
}

/** Asks Cosmo for a ticket for the caller and keeps it server-side. */
export async function startQr(userId: string, headers: Headers) {
  const browserUrl = serverEnv.COSMO_BROWSER_URL;
  if (!sessionsAvailable() || !browserUrl) refuseSession("cosmo_session_unavailable");
  // the store is probed before the browser or Cosmo is touched: with Redis down nothing starts
  if ((await readTicket(userId)) === "unavailable") refuseSession("cosmo_session_unavailable");

  await refuseOverLimits(
    [
      () => userRateLimited("cosmo-qr-start", userId, 2, 60),
      () => userRateLimited("cosmo-qr-start-day", userId, 10, 86400),
      () => ipRateLimited("cosmo-qr-start", headers, 5, 600),
    ],
    () => globalRateLimited("cosmo-qr-start", 10, 60),
  );

  let ticket: Awaited<ReturnType<typeof createLoginTicket>>;
  try {
    ticket = await createLoginTicket(await mintRecaptchaToken(browserUrl));
  } catch (err) {
    const kind = kindOf(err);
    console.warn("Cosmo QR start failed:", kind);
    refuseSession(startRefusal(kind));
  }
  const expireAt = Date.parse(ticket.expireAt);
  // replaces the caller's earlier ticket
  if (!(await storeTicket(userId, { ticket: ticket.ticket, expireAt, last: null }))) {
    refuseSession("cosmo_session_unavailable");
  }
  return {
    qr: `cosmo://ticket-login?t=${encodeURIComponent(ticket.ticket)}`,
    expiresAt: expireAt,
    expiresInMs: Math.max(0, expireAt - Date.now()),
  };
}

/** One status check of the caller's own ticket, with the time left on the server's clock. */
export async function pollQr(userId: string) {
  const state = await readPoll(userId);
  return withRemaining(state, Date.now());
}

async function readPoll(userId: string): Promise<PollState> {
  if (await userRateLimited("cosmo-qr-poll", userId, 30, 60)) refuseRateLimit();
  const stored = await readTicket(userId);
  if (stored === "unavailable") refuseSession("cosmo_session_unavailable");
  if (stored === "none") return { state: "expired" };

  const now = Date.now();
  // over the site's budget the poll is not refused: it answers from the last state, so a busy
  // minute only slows the dialog
  if (await globalRateLimited("cosmo-qr-poll", 120, 60)) {
    return pollFallback(stored.last, stored.expireAt, now);
  }
  let state: PollState;
  try {
    const read = pollState(await readLoginTicket(stored.ticket), now);
    // certified: the sign-in is in progress, and certify (not a poll) ends it
    if (read === null) return pollFallback(stored.last, stored.expireAt, now);
    state = read;
  } catch (err) {
    const kind = kindOf(err);
    // Cosmo being down says nothing about the ticket; its own deadline still ends the attempt
    if (kind === "unavailable" || kind === "busy") {
      return pollFallback(stored.last, stored.expireAt, now);
    }
    state = { state: "expired" };
  }
  if (state.state === "expired") await clearTicket(userId, stored.ticket);
  else await rememberState(userId, stored, state);
  return state;
}

type ConnectResult =
  | { ok: true; replaced: SealedSession | null; noticeCleared: boolean }
  | { ok: false; reason: CosmoSessionRefusal };

/**
 * One transaction. Lock order is the user row, the user's connects, the address, then session rows, the order a
 * ban or the account scrub takes (the user row first): one that committed during the sign-in is
 * seen here, one that starts later waits for this commit and then deletes the row.
 */
function storeSession(
  userId: string,
  me: { nickname: string; address: string },
  cookie: string,
  cookieExpiresAt: Date,
  key: string,
): Promise<ConnectResult> {
  return db.transaction(async (tx): Promise<ConnectResult> => {
    const [account] = await tx
      .select({ banned: user.banned, banExpires: user.banExpires, deletedAt: user.deletedAt })
      .from(user)
      .where(eq(user.id, userId))
      .for("share");
    if (!account || connectBlocked(account, Date.now())) {
      return { ok: false, reason: "cosmo_session_not_allowed" };
    }
    // one user's connects take turns, so two addresses cannot both pass the 3-account limit
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${`cosmo_session_user:${userId}`}, 0))`,
    );
    // two connects of one Cosmo account take turns, so each sees (and signs out) the other's cookie
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${`cosmo_session:${me.address.toLowerCase()}`}, 0))`,
    );
    const [existing] = await tx
      .select({
        userId: cosmoSession.userId,
        address: cosmoSession.cosmoAddress,
        sealed: cosmoSession.cookieSealed,
      })
      .from(cosmoSession)
      .where(eq(cosmoSession.cosmoAddress, me.address))
      .for("update");
    const held = await tx
      .select({ address: cosmoSession.cosmoAddress })
      .from(cosmoSession)
      .where(eq(cosmoSession.userId, userId));
    if (
      !connectAllowed(
        held.map((row) => row.address),
        me.address,
      )
    ) {
      return { ok: false, reason: "cosmo_session_limit" };
    }

    const now = new Date().toISOString();
    const sealed = seal(cookie, key, sessionAad(userId, me.address));
    // a new owner starts from an empty history; the same owner keeps theirs
    const newOwner = !existing || existing.userId !== userId;
    const [row] = await tx
      .insert(cosmoSession)
      .values({
        userId,
        cosmoAddress: me.address,
        cosmoNickname: me.nickname,
        cookieSealed: sealed,
        cookieExpiresAt: cookieExpiresAt.toISOString(),
        syncRequestedAt: now,
      })
      .onConflictDoUpdate({
        target: cosmoSession.cosmoAddress,
        set: {
          userId,
          cosmoNickname: me.nickname,
          cookieSealed: sealed,
          cookieExpiresAt: cookieExpiresAt.toISOString(),
          // the 180 days run from this connect
          createdAt: now,
          syncRequestedAt: now,
          deadAt: null,
          lastError: null,
          syncCursor: null,
          // the next cycle of 180 days earns its own expiry notice
          expiryNotifiedAt: null,
          ...(newOwner ? { lastSync: null, lastSyncedAt: null } : {}),
        },
      })
      .returning({ id: cosmoSession.id });
    // a renew answers the bell's request for it; the key's prefix names this row, any expiry
    const cleared = row
      ? await tx
          .update(notification)
          .set({ readAt: now })
          .where(
            and(
              eq(notification.userId, userId),
              eq(notification.type, "cosmo_session_expiry"),
              isNull(notification.readAt),
              like(notification.groupKey, `cosmo_session_expiry:${row.id}:%`),
            ),
          )
          .returning({ id: notification.id })
      : [];
    return {
      ok: true,
      noticeCleared: cleared.length > 0,
      replaced: existing?.sealed
        ? { userId: existing.userId, address: existing.address, sealed: existing.sealed }
        : null,
    };
  });
}

/** Sends the 2-digit code for the caller's own ticket and, on success, stores the session. */
export async function certifyQr(userId: string, otp: number) {
  const key = serverEnv.COSMO_SESSION_KEY;
  if (!sessionsAvailable() || !key) refuseSession("cosmo_session_unavailable");
  await refuseOverLimits([() => userRateLimited("cosmo-qr-certify", userId, 10, 60)], () =>
    globalRateLimited("cosmo-qr-certify", 30, 60),
  );
  // read before the code is sent, so a code is never spent on a request that cannot finish
  const stored = await readTicket(userId);
  if (stored === "unavailable") refuseSession("cosmo_session_unavailable");
  if (stored === "none") refuseSession("cosmo_session_expired");

  let signedIn: Awaited<ReturnType<typeof certifyLoginTicket>>;
  try {
    signedIn = await certifyLoginTicket(stored.ticket, otp);
  } catch (err) {
    const outcome = certifyOutcome(
      kindOf(err),
      codeDeadline(stored.last, stored.expireAt),
      Date.now(),
    );
    // a wrong code keeps the ticket for a few more tries; anything else ends it
    if (outcome === "wrong_code") {
      const counted = await recordWrongCode(userId, stored.ticket);
      if (counted === "unavailable") refuseSession("cosmo_session_unavailable");
      if (counted !== "counted") refuseSession("cosmo_session_expired");
      refuseSession("cosmo_session_wrong_code");
    }
    await clearTicket(userId, stored.ticket);
    refuseSession(outcome === "expired" ? "cosmo_session_expired" : "cosmo_session_cosmo_error");
  }

  // from here Cosmo holds a session: any way out but a stored row signs it out
  let result: ConnectResult | undefined;
  let nickname = "";
  try {
    let me: Awaited<ReturnType<typeof fetchSessionUser>>;
    try {
      me = await fetchSessionUser(signedIn.cookie);
    } catch {
      refuseSession("cosmo_session_cosmo_error");
    }
    nickname = me.nickname;
    result = await storeSession(
      userId,
      me,
      signedIn.cookie,
      cookieExpiry(signedIn.expiresAt, Date.now()),
      key,
    );
  } finally {
    await clearTicket(userId, stored.ticket);
    // after the transaction, best effort, and not awaited: the caller needs no answer from Cosmo
    if (!result?.ok) void signOutCookies([signedIn.cookie]);
    else if (result.replaced) void signOutSealed([result.replaced]);
  }
  if (!result.ok) refuseSession(result.reason);
  if (result.noticeCleared) await publishNotify(userId);
  return { nickname };
}
