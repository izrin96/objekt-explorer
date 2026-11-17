import { describe, expect, test } from "bun:test";

import {
  MAX_PAGES,
  nextBackoff,
  nextPage,
  nextSyncAt,
  orderDue,
  parkAfterFailure,
  PAGE_SIZE,
  createRunBudget,
  spacingMs,
} from "./media-sync";

const MIN = 60_000;
const HOUR = 60 * MIN;
const now = Date.parse("2026-11-17T00:00:00Z");

describe("nextPage", () => {
  test("goes on while the count is not reached and the page was full", () => {
    expect(
      nextPage({ page: 1, received: PAGE_SIZE, collectionCount: 100, pageLength: PAGE_SIZE }),
    ).toBe(2);
  });

  test("stops once the received items reach the count", () => {
    expect(
      nextPage({ page: 4, received: 100, collectionCount: 100, pageLength: PAGE_SIZE }),
    ).toBeNull();
    expect(
      nextPage({ page: 4, received: 130, collectionCount: 100, pageLength: PAGE_SIZE }),
    ).toBeNull();
  });

  test("stops on a short page", () => {
    expect(nextPage({ page: 2, received: 50, collectionCount: 100, pageLength: 20 })).toBeNull();
  });

  test("stops on an empty page", () => {
    expect(nextPage({ page: 1, received: 0, collectionCount: 100, pageLength: 0 })).toBeNull();
  });

  test("stops after 40 pages", () => {
    expect(
      nextPage({
        page: MAX_PAGES - 1,
        received: 1000,
        collectionCount: 5000,
        pageLength: PAGE_SIZE,
      }),
    ).toBe(MAX_PAGES);
    expect(
      nextPage({ page: MAX_PAGES, received: 1200, collectionCount: 5000, pageLength: PAGE_SIZE }),
    ).toBeNull();
  });

  test("an artist holding nothing stops on the first page", () => {
    expect(nextPage({ page: 1, received: 0, collectionCount: 0, pageLength: 0 })).toBeNull();
  });
});

describe("orderDue", () => {
  const s = (id: number, over: Record<string, unknown> = {}) => ({
    id,
    syncCursor: null as { artist: string; page: number } | null,
    syncRequestedAt: null as number | null,
    nextSyncAt: now + HOUR,
    cookieExpiresAt: now + 100 * 24 * HOUR,
    ...over,
  });

  test("a session that is not due is left out", () => {
    expect(orderDue([s(1)], now)).toEqual([]);
  });

  test("due when requested, when next_sync_at has passed, or when the cookie has expired", () => {
    const due = orderDue(
      [
        s(1, { syncRequestedAt: now - 1 }),
        s(2, { nextSyncAt: now }),
        s(3, { cookieExpiresAt: now }),
        s(4),
      ],
      now,
    );
    expect(due.map((x) => x.id).toSorted((a, b) => a - b)).toEqual([1, 2, 3]);
  });

  test("a cursor goes first, then requested by request time, then by next_sync_at", () => {
    const sessions = [
      s(1, { nextSyncAt: now - 5 * MIN }),
      s(2, { syncRequestedAt: now - 1 * MIN, nextSyncAt: now - 90 * MIN }),
      s(3, { syncRequestedAt: now - 10 * MIN, nextSyncAt: now - 80 * MIN }),
      s(4, { nextSyncAt: now - 30 * MIN }),
      s(5, { syncCursor: { artist: "tripleS", page: 3 }, nextSyncAt: now - 1 * MIN }),
    ];
    expect(orderDue(sessions, now).map((x) => x.id)).toEqual([5, 3, 2, 4, 1]);
  });

  test("ties break by id, so the order is stable", () => {
    const sessions = [s(9, { nextSyncAt: now - 1 }), s(7, { nextSyncAt: now - 1 })];
    expect(orderDue(sessions, now).map((x) => x.id)).toEqual([7, 9]);
  });

  test("does not change the input order", () => {
    const sessions = [s(2, { nextSyncAt: now - 1 }), s(1, { nextSyncAt: now - 2 })];
    orderDue(sessions, now);
    expect(sessions.map((x) => x.id)).toEqual([2, 1]);
  });
});

describe("nextSyncAt", () => {
  test("is 72 hours plus 0 to 360 minutes", () => {
    for (let id = 1; id <= 500; id++) {
      const offset = nextSyncAt(id, now) - now - 72 * HOUR;
      expect(offset).toBeGreaterThanOrEqual(0);
      expect(offset).toBeLessThanOrEqual(360 * MIN);
      expect(offset % MIN).toBe(0);
    }
  });

  test("is the same for the same id", () => {
    expect(nextSyncAt(42, now)).toBe(nextSyncAt(42, now));
    expect(nextSyncAt(42, now + HOUR) - nextSyncAt(42, now)).toBe(HOUR);
  });

  test("is fixed by the id alone, the same in every process", () => {
    // pinned values: a changed hash would move every session's schedule at once
    expect(nextSyncAt(1, 0)).toBe(72 * HOUR + 245 * MIN);
    expect(nextSyncAt(2, 0)).toBe(72 * HOUR + 316 * MIN);
    expect(nextSyncAt(1234, 0)).toBe(72 * HOUR + 61 * MIN);
  });

  test("spreads neighbouring ids apart", () => {
    const offsets = new Set(Array.from({ length: 50 }, (_, i) => nextSyncAt(i + 1, 0)));
    expect(offsets.size).toBeGreaterThan(40);
  });
});

describe("nextBackoff", () => {
  test("starts at 5 minutes", () => {
    expect(nextBackoff(null)).toBe(5);
    expect(nextBackoff(0)).toBe(5);
  });

  test("doubles, capped at 120", () => {
    expect(nextBackoff(5)).toBe(10);
    expect(nextBackoff(10)).toBe(20);
    expect(nextBackoff(40)).toBe(80);
    expect(nextBackoff(80)).toBe(120);
    expect(nextBackoff(120)).toBe(120);
  });
});

describe("spacingMs", () => {
  test("is 1 s plus 0 to 500 ms of jitter", () => {
    expect(spacingMs(() => 0)).toBe(1000);
    expect(spacingMs(() => 0.999999)).toBe(1500);
  });
});

describe("createRunBudget", () => {
  test("allows 50 requests", () => {
    const b = createRunBudget(() => 0);
    for (let i = 0; i < 50; i++) {
      expect(b.canRequest()).toBe(true);
      b.spend();
    }
    expect(b.canRequest()).toBe(false);
  });

  test("canStartSession is false below 2 requests left", () => {
    const b = createRunBudget(() => 0);
    b.spend(48);
    expect(b.canStartSession()).toBe(true);
    b.spend();
    expect(b.canStartSession()).toBe(false);
    expect(b.canRequest()).toBe(true);
  });

  test("ends after 4 minutes", () => {
    let t = 1000;
    const b = createRunBudget(() => t);
    t += 4 * MIN - 1;
    expect(b.canRequest()).toBe(true);
    expect(b.canStartSession()).toBe(true);
    t += 1;
    expect(b.canRequest()).toBe(false);
    expect(b.canStartSession()).toBe(false);
  });

  test("counts what was spent", () => {
    const b = createRunBudget(() => 0);
    b.spend(3);
    b.spend();
    expect(b.spent).toBe(4);
  });
});

describe("parkAfterFailure", () => {
  test("waits 6 hours and drops the sync request, so a request cannot bypass the delay", () => {
    expect(parkAfterFailure(now)).toEqual({
      nextSyncAt: new Date(now + 6 * HOUR).toISOString(),
      syncRequestedAt: null,
    });
  });
});
