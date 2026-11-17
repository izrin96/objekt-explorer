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
  syncRequestedAt: number | null;
  nextSyncAt: number;
  cookieExpiresAt: number;
};

/**
 * Live sessions that are due, in the order to sync them: a cursor first (finish what was
 * started), then requested ones by request time, then the rest by `nextSyncAt`. Times are epoch ms.
 */
export function orderDue<T extends DueSession>(sessions: readonly T[], now: number) {
  const rank = (s: T) => (s.syncCursor ? 0 : s.syncRequestedAt !== null ? 1 : 2);
  return sessions
    .filter((s) => s.syncRequestedAt !== null || s.nextSyncAt <= now || s.cookieExpiresAt <= now)
    .toSorted(
      (a, b) =>
        rank(a) - rank(b) ||
        (rank(a) === 2 ? 0 : (a.syncRequestedAt ?? 0) - (b.syncRequestedAt ?? 0)) ||
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
