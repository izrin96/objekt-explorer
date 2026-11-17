// The pure rules of the collection-media sync (Decision 10): paging, due order, cadence, backoff
// and the per-run budget. No database, Redis or Cosmo access, so it can be tested on its own.

const MIN = 60_000;
const HOUR = 60 * MIN;

export const PAGE_SIZE = 30;
export const MAX_PAGES = 40;
const RUN_REQUESTS = 50;
const RUN_MS = 4 * MIN;
const SESSION_MIN_REQUESTS = 2;
const SYNC_EVERY_MS = 72 * HOUR;
const JITTER_MINUTES = 360;
const BACKOFF_FIRST = 5;
const BACKOFF_CAP = 120;
const RETRY_AFTER_MS = 6 * HOUR;

/**
 * The page to read after `page` (1-based, the one just read), or null when the artist is done:
 * the received items reach `collectionCount`, the page came back short, or 40 pages were read.
 * `received` and `pageLength` count raw items, malformed ones included.
 */
export function nextPage(p: {
  page: number;
  received: number;
  collectionCount: number;
  pageLength: number;
}) {
  if (p.received >= p.collectionCount) return null;
  if (p.pageLength < PAGE_SIZE) return null;
  if (p.page >= MAX_PAGES) return null;
  return p.page + 1;
}

type DueSession = {
  id: number;
  syncCursor: unknown;
  lastError?: string | null;
  syncRequestedAt: number | null;
  nextSyncAt: number;
  cookieExpiresAt: number;
};

/**
 * Live sessions that are due, in the order to sync them: a cursor first (finish what was
 * started), then requested ones by request time, then the rest by `nextSyncAt`. A session whose
 * last run ended in `cosmo_unavailable` goes after all of them, cursor or not, so another session
 * probes Cosmo first and one persistently failing page cannot starve the rest. Times are epoch ms.
 */
export function orderDue<T extends DueSession>(sessions: readonly T[], now: number) {
  const rank = (s: T) =>
    s.lastError === "cosmo_unavailable" ? 3 : s.syncCursor ? 0 : s.syncRequestedAt !== null ? 1 : 2;
  return sessions
    .filter((s) => s.syncRequestedAt !== null || s.nextSyncAt <= now || s.cookieExpiresAt <= now)
    .toSorted(
      (a, b) =>
        rank(a) - rank(b) ||
        (rank(a) >= 2 ? 0 : (a.syncRequestedAt ?? 0) - (b.syncRequestedAt ?? 0)) ||
        a.nextSyncAt - b.nextSyncAt ||
        a.id - b.id,
    );
}

// FNV-1a: fixed by the id alone, so every process and restart agrees (no seed, no Math.random)
function hashId(id: number) {
  let h = 0x811c9dc5;
  for (const ch of String(id)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** 72 hours after `completedAt`, plus the id hashed to 0..360 minutes so accounts connected together drift apart. */
export function nextSyncAt(id: number, completedAt: number) {
  return completedAt + SYNC_EVERY_MS + (hashId(id) % (JITTER_MINUTES + 1)) * MIN;
}

/**
 * The columns a session's own failure sets: wait 6 hours and drop the sync request. A request
 * makes a session due whatever `next_sync_at` says, so one left in place would retry the failure
 * on the next run and bypass the delay.
 */
export function parkAfterFailure(now: number) {
  return { nextSyncAt: new Date(now + RETRY_AFTER_MS).toISOString(), syncRequestedAt: null };
}

/** Minutes to back off after a failing run: 5, then doubling, capped at 120. */
export function nextBackoff(previousMinutes: number | null) {
  return previousMinutes ? Math.min(previousMinutes * 2, BACKOFF_CAP) : BACKOFF_FIRST;
}

/** Wait between two Cosmo requests: 1 s plus 0 to 500 ms. */
export function spacingMs(random: () => number = Math.random) {
  return 1000 + Math.floor(random() * 501);
}

/** What one run may spend: 50 requests and 4 minutes, counted from creation. */
export function createRunBudget(now: () => number = Date.now) {
  const startedAt = now();
  let spent = 0;
  const timeLeft = () => now() - startedAt < RUN_MS;
  return {
    get spent() {
      return spent;
    },
    spend(requests = 1) {
      spent += requests;
    },
    canRequest() {
      return spent < RUN_REQUESTS && timeLeft();
    },
    /** A session costs at least `users/me` and one page. */
    canStartSession() {
      return RUN_REQUESTS - spent >= SESSION_MIN_REQUESTS && timeLeft();
    },
  };
}

/**
 * Whether a Cosmo error is Cosmo-wide (back off for everyone) rather than this session's own
 * failure: only a busy or unavailable answer while nothing in this run has been answered yet. Once
 * Cosmo has answered any request, the same error belongs to the session that hit it.
 */
export function isCosmoWideOutage(kind: string, answeredThisRun: boolean) {
  return (kind === "busy" || kind === "unavailable") && !answeredThisRun;
}

export type SyncCounts = { seen: number; recorded: number; applied: number; skipped: number };
export type SyncCursor = { artist: string; page: number; stats: SyncCounts };

export const emptyCounts = (): SyncCounts => ({ seen: 0, recorded: 0, applied: 0, skipped: 0 });

export function addCounts(a: SyncCounts, b: SyncCounts): SyncCounts {
  return {
    seen: a.seen + b.seen,
    recorded: a.recorded + b.recorded,
    applied: a.applied + b.applied,
    skipped: a.skipped + b.skipped,
  };
}

const count = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0);

/** Reads `sync_cursor`; a cursor from before the counts were carried has none, and starts from zero. */
export function parseCursor(raw: unknown): SyncCursor | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { artist, page, stats } = raw as Record<string, unknown>;
  if (typeof artist !== "string" || typeof page !== "number" || !Number.isFinite(page)) return null;
  const s = (typeof stats === "object" && stats !== null ? stats : {}) as Record<string, unknown>;
  return {
    artist,
    page,
    stats: {
      seen: count(s.seen),
      recorded: count(s.recorded),
      applied: count(s.applied),
      skipped: count(s.skipped),
    },
  };
}

const KEEPALIVE_AGE_MS = 25 * MIN;
const KEEPALIVE_JITTER_MINUTES = 6;
const KEPT_WINDOW_MS = 45 * MIN;
export const KEEPALIVE_SLICE = 20;
export const KEEPALIVE_BACKOFF_SLICE = 5;

/** 25 minutes minus 0..5 from the id, so 20 to 25: it never adds, which keeps the worst idle time bounded. */
export function keepAliveAgeMs(id: number) {
  return KEEPALIVE_AGE_MS - (hashId(id) % KEEPALIVE_JITTER_MINUTES) * MIN;
}

/** The later of last use and connect time (a reconnect resets `created_at`); epoch ms. */
export function lastUseOf(s: { lastUsedAt: number | null; createdAt: number }) {
  return s.lastUsedAt === null ? s.createdAt : Math.max(s.lastUsedAt, s.createdAt);
}

type KeepAliveCandidate = {
  id: number;
  lastUsedAt: number | null;
  createdAt: number;
  cookieExpiresAt: number;
};

/**
 * Sessions past their own keep-alive age and before their expiry, in two tiers. Tier 1 is
 * sessions used under 45 minutes ago, still savable; tier 2 is the rest, already likely dead.
 * Each tier is longest unused first, ties by id, so a pile of stale rows never starves a session
 * that can still be saved. The caller applies the slice, since it counts requests sent.
 */
export function planKeepAlive(sessions: readonly KeepAliveCandidate[], now: number) {
  return sessions
    .filter((s) => s.cookieExpiresAt > now)
    .map((s) => ({ id: s.id, lastUse: lastUseOf(s) }))
    .filter((s) => now - s.lastUse >= keepAliveAgeMs(s.id))
    .toSorted(
      (a, b) =>
        Number(!endedWhileKept(a.lastUse, now)) - Number(!endedWhileKept(b.lastUse, now)) ||
        a.lastUse - b.lastUse ||
        a.id - b.id,
    )
    .map((s) => ({ id: s.id, idleMs: now - s.lastUse }));
}

export const KEEPALIVE_DEAD_STREAK = 5;
export const KEEPALIVE_FAILURE_STREAK = 3;

/**
 * Decides after each touch answer whether the phase goes on. Without a 2xx in the run, a streak of
 * dead answers or (outside a backoff) of refused or unexpected ones means the problem is not the
 * sessions, so it stops before marking or sending more. `stop` is a backoff meeting busy or
 * unavailable.
 */
export function createKeepAliveGuard(backingOff: boolean) {
  let sawOk = false;
  let deadStreak = 0;
  let failureStreak = 0;
  return {
    record(kind: "ok" | "dead" | "busy" | "unavailable" | "refused" | "unexpected") {
      const dead = kind === "dead";
      const failure = kind === "refused" || kind === "unexpected";
      deadStreak = dead ? deadStreak + 1 : 0;
      failureStreak = failure ? failureStreak + 1 : 0;
      if (kind === "ok") sawOk = true;
      if (backingOff && (kind === "busy" || kind === "unavailable")) return "stop" as const;
      if (sawOk) return "continue" as const;
      if (deadStreak >= KEEPALIVE_DEAD_STREAK) return "dead_streak" as const;
      if (!backingOff && failureStreak >= KEEPALIVE_FAILURE_STREAK) return "failures" as const;
      return "continue" as const;
    },
  };
}

/** Cosmo ended a session that was used under 45 minutes ago, so not for idleness. */
export function endedWhileKept(lastUse: number, now: number) {
  return now - lastUse < KEPT_WINDOW_MS;
}

/** `COSMO_SESSION_KEEPALIVE`: only `on` turns it on; any other non-empty value other than `off` is off and unknown. */
export function keepAliveSwitch(raw: string | undefined) {
  const value = (raw ?? "").trim().toLowerCase();
  if (value === "on") return { on: true, unknown: false };
  return { on: false, unknown: value !== "" && value !== "off" };
}
