import { logoutSession } from "@repo/cosmo/server/session";
import { CosmoSessionError } from "@repo/cosmo/server/shop";
import type { CosmoErrorKind } from "@repo/cosmo/session-parse";
import type { Tx } from "@repo/db";
import { db } from "@repo/db";
import { cosmoSession } from "@repo/db/schema";
import { open, sessionAad } from "@repo/lib/server/sealed";
import { and, asc, eq, isNull } from "drizzle-orm";

import { serverEnv } from "../../env";
import { logoutConfirmed } from "../../lib/cosmo-qr";
import type { CosmoSessionList } from "../../schemas/cosmo-session";
import { refuseOverUserLimit } from "../redis";
import { refuseSession } from "./refusal";

/** False when `COSMO_SESSION_KEY` or `COSMO_BROWSER_URL` is unset: connecting is off. */
export const sessionsAvailable = () =>
  Boolean(serverEnv.COSMO_SESSION_KEY && serverEnv.COSMO_BROWSER_URL);

const iso = (value: string) => new Date(value).toISOString();

/** The caller's own sessions only; never a cookie, a sealed value or a user field. */
export async function listSessions(userId: string): Promise<CosmoSessionList> {
  const rows = await db
    .select({
      id: cosmoSession.id,
      nickname: cosmoSession.cosmoNickname,
      address: cosmoSession.cosmoAddress,
      createdAt: cosmoSession.createdAt,
      cookieExpiresAt: cosmoSession.cookieExpiresAt,
      lastSyncedAt: cosmoSession.lastSyncedAt,
      lastSync: cosmoSession.lastSync,
      lastError: cosmoSession.lastError,
      deadAt: cosmoSession.deadAt,
      syncRequestedAt: cosmoSession.syncRequestedAt,
    })
    .from(cosmoSession)
    .where(eq(cosmoSession.userId, userId))
    .orderBy(asc(cosmoSession.createdAt), asc(cosmoSession.id));
  return {
    available: sessionsAvailable(),
    sessions: rows.map((row) => ({
      id: row.id,
      nickname: row.nickname,
      address: row.address,
      createdAt: iso(row.createdAt),
      expiresAt: iso(row.cookieExpiresAt),
      lastSyncedAt: row.lastSyncedAt ? iso(row.lastSyncedAt) : null,
      lastSync: row.lastSync,
      lastError: row.lastError,
      dead: row.deadAt !== null,
      syncRequested: row.syncRequestedAt !== null,
    })),
  };
}

/**
 * Sync now: the worker is the only writer of session data, so this only asks. Idempotent. 3 an
 * hour per user, so pressing it cannot spend the shared Cosmo budget.
 */
export async function requestSync(userId: string, id: number) {
  await refuseOverUserLimit("cosmo-sync", userId, 3, 3600);
  const updated = await db
    .update(cosmoSession)
    .set({ syncRequestedAt: new Date().toISOString() })
    .where(
      and(eq(cosmoSession.id, id), eq(cosmoSession.userId, userId), isNull(cosmoSession.deadAt)),
    )
    .returning({ id: cosmoSession.id });
  if (updated.length > 0) return;
  const [row] = await db
    .select({ id: cosmoSession.id })
    .from(cosmoSession)
    .where(and(eq(cosmoSession.id, id), eq(cosmoSession.userId, userId)));
  // another user's id reads exactly as one that does not exist
  refuseSession(row ? "cosmo_session_dead" : "cosmo_session_not_found");
}

export type SealedSession = { userId: string; address: string; sealed: string };

/** A sealed value that opens under the current key, else null (a wrong key is not a dead session). */
function openSealed({ userId, address, sealed }: SealedSession) {
  const key = serverEnv.COSMO_SESSION_KEY;
  if (!key) return null;
  try {
    return open(sealed, key, sessionAad(userId, address));
  } catch {
    return null;
  }
}

/** One sign-out at Cosmo, never throwing; a log line carries the kind only. */
async function signOutOne(
  cookie: string,
): Promise<{ ok: true } | { ok: false; kind: CosmoErrorKind }> {
  try {
    await logoutSession(cookie);
    return { ok: true };
  } catch (err) {
    const kind = err instanceof CosmoSessionError ? err.kind : "unavailable";
    console.warn("Cosmo sign-out not confirmed:", kind);
    return { ok: false, kind };
  }
}

/** Signs cookies out at Cosmo, after the transaction that dropped them. Never throws; true per cookie when confirmed. */
export async function signOutCookies(cookies: string[]): Promise<boolean[]> {
  const settled = await Promise.allSettled(cookies.map(signOutOne));
  return settled.map((r) => r.status === "fulfilled" && logoutConfirmed(r.value));
}

/** `signOutCookies` for sealed rows; ones that do not open are skipped. */
export async function signOutSealed(rows: SealedSession[]) {
  const cookies = rows.map(openSealed).filter((c): c is string => c !== null);
  await signOutCookies(cookies);
}

/**
 * Deletes the user's sessions inside the caller's transaction (a ban, or the account scrub) and
 * returns the sealed values, for `signOutSealed` after commit. Opening waits until then, so
 * nothing here needs the key.
 */
export async function revokeSessionsOf(tx: Tx, userId: string): Promise<SealedSession[]> {
  const rows = await tx
    .delete(cosmoSession)
    .where(eq(cosmoSession.userId, userId))
    .returning({ address: cosmoSession.cosmoAddress, sealed: cosmoSession.cookieSealed });
  return rows.flatMap((row) =>
    row.sealed ? [{ userId, address: row.address, sealed: row.sealed }] : [],
  );
}

/**
 * Deletes the row, then signs it out at Cosmo once. `confirmed` is false for a dead row and a
 * cookie that does not open (no sign-out is sent) and when Cosmo does not confirm.
 */
export async function disconnectSession(userId: string, id: number) {
  await refuseOverUserLimit("cosmo-disconnect", userId, 10, 60);
  const [row] = await db
    .delete(cosmoSession)
    .where(and(eq(cosmoSession.id, id), eq(cosmoSession.userId, userId)))
    .returning({ address: cosmoSession.cosmoAddress, sealed: cosmoSession.cookieSealed });
  if (!row) refuseSession("cosmo_session_not_found");
  const cookie = row.sealed
    ? openSealed({ userId, address: row.address, sealed: row.sealed })
    : null;
  if (!cookie) return { confirmed: false };
  const [confirmed] = await signOutCookies([cookie]);
  return { confirmed: confirmed === true };
}
