import type { fetchObjektSummaries } from "@repo/cosmo/server/session";
import { db } from "@repo/db";
import { cosmoSession } from "@repo/db/schema";
import { and, eq, sql } from "drizzle-orm";

import { heartbeat, log } from "@/lib/log";
import { type createRunBudget, spacingMs } from "@/lib/media-sync";

export const mediaLog = log("collection-media");
export const mediaBeat = heartbeat(mediaLog);

export const DUE_READ_LIMIT = 200;

export const iso = (ms: number) => new Date(ms).toISOString();
// ISO 8601 with the database's full precision, so a value read back compares equal when matched
export const isoOf = (column: unknown) => sql<string>`to_json(${column}) #>> '{}'`;

export type SessionRow = {
  id: number;
  userId: string;
  cosmoAddress: string;
  objektsConsented: boolean;
  cookieSealed: string;
  syncCursor: unknown;
  lastError: string | null;
  syncRequestedAt: number | null;
  nextSyncAt: number;
  cookieExpiresAt: number;
};

export type Page = Awaited<ReturnType<typeof fetchObjektSummaries>>;

/** One run's shared state: the Cosmo budget, request pacing and the counts the summary logs. */
export type Run = {
  budget: ReturnType<typeof createRunBudget>;
  lastRequestAt: number;
  requests: number;
  cosmoDown: boolean;
  cosmoAnswered: boolean;
  rejectedHosts: Set<string>;
  keyUnreadable: number;
  failedSessions: number[];
  recorded: number;
  markedDead: number;
  /** Sessions a keep-alive found signed out: hours since connect, and whether Cosmo ended it while kept. */
  keepEnded: { hours: number; kept: boolean }[];
  /** The indexer's final height, read before the first page request (touches may come first); null records no objekts. */
  chainHeight: number | null;
  objektsRecorded: number;
  objektsFailed: number;
};

export async function pace(run: Run) {
  const wait = run.lastRequestAt + spacingMs() - Date.now();
  if (run.requests > 0 && wait > 0) await Bun.sleep(wait);
  run.lastRequestAt = Date.now();
  run.requests += 1;
  run.budget.spend();
}

/**
 * Every worker write to a session row carries the cookie this run read: a Renew in between puts a
 * fresh cookie and request on the row, and a stale write (a park, a result) must not touch them.
 * A write that matches nothing is skipped.
 */
export function ownRow(session: SessionRow) {
  return and(eq(cosmoSession.id, session.id), eq(cosmoSession.cookieSealed, session.cookieSealed));
}

/** Marks a session dead and erases its cookie, but only while the row still holds `sealed`. */
export async function markDead(
  run: Run,
  session: SessionRow,
  error: "session_dead" | "session_expired",
  now: number,
) {
  const marked = await db
    .update(cosmoSession)
    .set({
      deadAt: iso(now),
      cookieSealed: null,
      lastError: error,
      syncCursor: null,
      syncRequestedAt: null,
    })
    .where(ownRow(session))
    .returning({ id: cosmoSession.id });
  run.markedDead += marked.length;
}
