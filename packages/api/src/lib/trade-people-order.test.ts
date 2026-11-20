import { describe, expect, test } from "bun:test";

import {
  buildPeopleOrder,
  nextSlice,
  type OrderEntry,
  orderReader,
  ordersFingerprint,
  readBatches,
  readBudget,
  resumeAt,
} from "./trade-people-order";

describe("readBudget", () => {
  test("the first read always runs, later ones spend the budget", () => {
    const reads = readBudget(2);
    expect(reads.allow(false)).toBe(true);
    expect(reads.allow(false)).toBe(true);
    expect(reads.allow(false)).toBe(false);
    expect(reads.allow(true)).toBe(true);
  });
});

describe("readBatches", () => {
  /** rows 1..n in order; `kept` decides who survives stage 2 */
  const source = (n: number, kept: (row: number) => boolean) => {
    let at = 0;
    return {
      fetch: async (limit: number) => {
        const rows = Array.from({ length: Math.min(limit, n - at) }, (_, i) => at + i + 1);
        at += rows.length;
        return { rows, exhausted: at >= n };
      },
      load: async (rows: number[]) => rows.filter(kept),
    };
  };

  test("a first batch that all emptied still moves past it", async () => {
    const read = await readBatches({ need: 3, budget: readBudget(0), ...source(10, () => false) });
    expect(read).toEqual({ taken: [], examined: 3, dry: false });
  });

  test("the budget stops a run of sold-out rows without calling them dry", async () => {
    const read = await readBatches({
      need: 2,
      budget: readBudget(2),
      ...source(20, (row) => row > 15),
    });
    // three reads of two rows each, all emptied
    expect(read).toEqual({ taken: [], examined: 6, dry: false });
  });

  test("the first read runs on a spent budget", async () => {
    const budget = readBudget(0);
    expect(budget.allow(false)).toBe(false);
    const read = await readBatches({ need: 2, budget, ...source(5, () => true) });
    expect(read).toEqual({ taken: [1, 2], examined: 2, dry: false });
  });

  test("rows running out is dry, and keeps what it found", async () => {
    const read = await readBatches({
      need: 4,
      budget: readBudget(3),
      ...source(3, (row) => row !== 2),
    });
    expect(read).toEqual({ taken: [1, 3], examined: 3, dry: true });
  });
});

const ids = (people: OrderEntry[]) => people.map((entry) => entry.id);
const entries = (...names: string[]) => names.map((id) => ({ id }));

describe("buildPeopleOrder", () => {
  test("keeps the sections in order, each tagged", () => {
    const { people, capped } = buildPeopleOrder(
      [
        { section: "mutual", people: entries("m1", "m2") },
        { section: "oneWay", people: entries("o1") },
        { people: entries("t1", "t2") },
      ],
      undefined,
    );
    expect(people).toEqual([
      { id: "m1", section: "mutual" },
      { id: "m2", section: "mutual" },
      { id: "o1", section: "oneWay" },
      { id: "t1" },
      { id: "t2" },
    ]);
    expect(capped).toBe(false);
  });

  test("a person in two sections keeps the first place", () => {
    const { people } = buildPeopleOrder(
      [
        {
          section: "mutual",
          people: [{ id: "a" }],
        },
        { section: "oneWay", people: entries("b", "a", "c") },
      ],
      undefined,
    );
    expect(people.map((entry) => [entry.id, entry.section])).toEqual([
      ["a", "mutual"],
      ["b", "oneWay"],
      ["c", "oneWay"],
    ]);
  });

  test("leaves out the lead", () => {
    const { people } = buildPeopleOrder(
      [{ section: "oneWay", people: entries("a", "lead") }, { people: entries("lead", "b") }],
      "lead",
    );
    expect(ids(people)).toEqual(["a", "b"]);
  });

  test("stops at the cap and says so", () => {
    const sections = [
      { section: "mutual" as const, people: entries("a", "b") },
      { people: entries("c", "d") },
    ];
    const cut = buildPeopleOrder(sections, undefined, 3);
    expect(ids(cut.people)).toEqual(["a", "b", "c"]);
    expect(cut.capped).toBe(true);
    expect(buildPeopleOrder(sections, undefined, 4).capped).toBe(false);
  });

  test("repeats and the lead don't count toward the cap", () => {
    const { people, capped } = buildPeopleOrder(
      [{ section: "mutual", people: entries("a", "lead") }, { people: entries("a", "b") }],
      "lead",
      2,
    );
    expect(ids(people)).toEqual(["a", "b"]);
    expect(capped).toBe(false);
  });
});

describe("nextSlice", () => {
  const people = entries("a", "b", "c");

  test("reads from the position", () => {
    expect(ids(nextSlice(people, 1, 5))).toEqual(["b", "c"]);
    expect(ids(nextSlice(people, 0, 2))).toEqual(["a", "b"]);
  });

  test("is empty past the end", () => {
    expect(nextSlice(people, 3, 5)).toEqual([]);
    expect(nextSlice(people, 7, 5)).toEqual([]);
  });
});

describe("resumeAt", () => {
  const order: OrderEntry[] = [
    { id: "m1", section: "mutual" },
    { id: "m2", section: "mutual" },
    { id: "o1", section: "oneWay" },
    { id: "t1" },
    { id: "t2" },
  ];

  test("goes on after the cursor's person when they are in the order", () => {
    expect(resumeAt(order, { userId: "o1", at: 1 })).toBe(3);
    expect(resumeAt(order, { userId: "t2", at: 0 })).toBe(5);
  });

  test("else at the cursor's position", () => {
    expect(resumeAt(order, { userId: "gone", at: 2 })).toBe(2);
  });

  test("keeps a position past the end, so a capped order's tail goes on from the cursor's keyset", () => {
    expect(resumeAt(order, { userId: "gone", at: 9 })).toBe(9);
  });
});

describe("ordersFingerprint", () => {
  const base = {
    facets: { artist: ["tripleS", "artms"], member: [], season: ["Atom01"] },
    type: "all" as const,
    slug: null,
    mode: "any" as const,
    listId: 4,
    lead: null,
  };

  test("is the same in any key or value order", () => {
    const shuffled = {
      ...base,
      facets: { season: ["Atom01"], member: [], artist: ["artms", "tripleS"] },
    };
    expect(ordersFingerprint(shuffled)).toBe(ordersFingerprint(base));
  });

  test("differs when a filter, the mode, the Compare with list or the lead does", () => {
    const fingerprint = ordersFingerprint(base);
    for (const other of [
      { ...base, facets: { ...base.facets, member: ["SeoYeon"] } },
      { ...base, type: "wtt" as const },
      { ...base, slug: "atom01-seoyeon-204z" },
      { ...base, mode: "mutual" as const },
      { ...base, listId: null },
      { ...base, lead: "u1" },
    ]) {
      expect(ordersFingerprint(other)).not.toBe(fingerprint);
    }
  });
});

describe("orderReader", () => {
  const keyset = (userId: string, minute: number) => ({
    userId,
    bumpedAt: new Date(Date.UTC(2026, 9, 1, 0, 60 - minute)).toISOString(),
  });
  /** the tail past the cap, newest first, read by keyset */
  const past = [keyset("x1", 1), keyset("x2", 2), keyset("x3", 3)];
  const fetchMore =
    (calls: (string | undefined)[]) =>
    async (after: { userId: string } | undefined, limit: number) => {
      calls.push(after?.userId);
      const from = after ? past.findIndex((row) => row.userId === after.userId) + 1 : 0;
      return past.slice(from, from + limit);
    };
  const ids = (rows: { id: string }[]) => rows.map((row) => row.id);

  test("an uncapped order reads its entries and is exhausted at its end", async () => {
    const calls: (string | undefined)[] = [];
    const reader = orderReader({ people: entries("a", "b", "c") }, 1, undefined, fetchMore(calls));
    expect(await reader.fetch(1)).toEqual({ rows: [{ id: "b" }], exhausted: false });
    expect(await reader.fetch(5)).toEqual({ rows: [{ id: "c" }], exhausted: true });
    expect(reader.position()).toBe(3);
    expect(await reader.fetch(5)).toEqual({ rows: [], exhausted: true });
    expect(calls).toEqual([]);
  });

  test("at a capped order's end it goes on by keyset from `more`", async () => {
    const calls: (string | undefined)[] = [];
    const order = { people: entries("a", "b"), more: { after: keyset("b", 0) } };
    const reader = orderReader(order, 0, undefined, fetchMore(calls));
    expect(await reader.fetch(2)).toEqual({ rows: entries("a", "b"), exhausted: false });
    const next = await reader.fetch(2);
    expect(ids(next.rows)).toEqual(["x1", "x2"]);
    expect(next.rows[0]?.bumpedAt).toBe(past[0]?.bumpedAt);
    expect(next.exhausted).toBe(false);
    expect(await reader.fetch(2)).toMatchObject({ rows: [{ id: "x3" }], exhausted: true });
    expect(calls).toEqual(["b", "x2"]);
    expect(reader.position()).toBe(5);
  });

  test("a capped order with no tail kept reads the tail from its top", async () => {
    const calls: (string | undefined)[] = [];
    const reader = orderReader({ people: entries("a"), more: {} }, 1, undefined, fetchMore(calls));
    expect(ids((await reader.fetch(1)).rows)).toEqual(["x1"]);
    expect(calls).toEqual([undefined]);
  });

  test("a cursor resumed at the order's end goes on from `more`, not its own person", async () => {
    const calls: (string | undefined)[] = [];
    const order = { people: entries("a", "b"), more: { after: keyset("b", 0) } };
    const reader = orderReader(order, 2, keyset("x2", 2), fetchMore(calls));
    expect(ids((await reader.fetch(1)).rows)).toEqual(["x1"]);
    expect(calls).toEqual(["b"]);
  });

  test("a cursor already past the order goes on from the cursor's person", async () => {
    const calls: (string | undefined)[] = [];
    const order = { people: entries("a", "b"), more: { after: keyset("b", 0) } };
    const reader = orderReader(order, 3, keyset("x1", 1), fetchMore(calls));
    expect(ids((await reader.fetch(5)).rows)).toEqual(["x2", "x3"]);
    expect(calls).toEqual(["x1"]);
    expect(reader.position()).toBe(5);
  });

  test("one page reads past the order's end into the keyset", async () => {
    const reader = orderReader(
      { people: entries("a", "b"), more: { after: keyset("b", 0) } },
      1,
      undefined,
      fetchMore([]),
    );
    const read = await readBatches({
      need: 3,
      budget: readBudget(3),
      fetch: reader.fetch,
      load: async (rows) => rows.map((row) => row.id),
    });
    expect(read.taken).toEqual(["b", "x1", "x2"]);
    expect(read.examined?.id).toBe("x2");
    expect(read.dry).toBe(false);
    expect(reader.position()).toBe(4);
  });
});
