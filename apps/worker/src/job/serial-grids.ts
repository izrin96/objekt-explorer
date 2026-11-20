import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { isGridDrop, preBlockSeasons } from "@repo/lib/serial";
import { and, between, eq, inArray, like, ne, or, sql } from "drizzle-orm";

import {
  type DropRegion,
  fitDropGrid,
  fitMemberRun,
  MAX_SLOT,
  rosterComplete,
} from "@/lib/drop-grid";
import { type Batch, tokenIdSpans } from "@/lib/serial-math";

/**
 * Match tokenIds in [start, end]. Ids are varchar, so the range is compared per
 * digit length, where string order equals numeric order and the primary key
 * index still applies.
 */
export function tokenIdRange(start: number, end: number) {
  const parts = tokenIdSpans(start, end).map(({ len, lo, hi }) =>
    and(sql`length(${objekts.id}) = ${len}`, between(objekts.id, String(lo), String(hi))),
  );
  return or(...parts);
}

export type DropKey = {
  season: string;
  collectionNo: string;
  artist: (typeof collections.$inferSelect)["artist"];
};

export type DropMember = { id: string; slug: string; batches: Batch[]; tokens: number[] };

export { isGridDrop };

/**
 * A drop's minted members in member order and the region the grid is fitted
 * on, read from the indexer. `override` stands in for one member's stored
 * batches while they are being rewritten. Null when fewer than two members
 * have minted. `pinned`: the token right before the start is another
 * collection's minted token; a first member yet to mint leaves it unminted.
 * `complete`: as many members minted as the largest other A drop of the
 * season and artist (`rosterComplete`). A fit marks or settles a drop only
 * when both hold.
 */
async function loadDrop(
  key: DropKey,
  override?: { collectionId: string; batches: Batch[] },
): Promise<{
  members: DropMember[];
  region: DropRegion;
  pinned: boolean;
  complete: boolean;
} | null> {
  const rows = await indexer
    .select({ id: collections.id, slug: collections.slug, batches: collections.serialBatches })
    .from(collections)
    .where(
      and(
        eq(collections.season, key.season),
        eq(collections.collectionNo, key.collectionNo),
        eq(collections.artist, key.artist),
        eq(collections.onOffline, "offline"),
      ),
    );
  if (rows.length < 2) return null;

  const members = await mintedMembers(rows, override);
  if (members.length < 2) return null;

  const first = members[0]!;
  const start = Math.min(first.tokens[0]!, ...first.batches.map((b) => b.start));
  const highest = Math.max(...members.map((m) => m.tokens.at(-1)!));
  const readUntil = Math.min(highest, start + members.length * MAX_SLOT) + MAX_SLOT;

  const memberIds = new Set(members.map((m) => m.id));
  const region = await indexer
    .select({
      id: objekts.id,
      collectionId: objekts.collectionId,
      season: collections.season,
      artist: collections.artist,
      collectionNo: collections.collectionNo,
      onOffline: collections.onOffline,
    })
    .from(objekts)
    .leftJoin(collections, eq(collections.id, objekts.collectionId))
    .where(tokenIdRange(start - 1, readUntil));
  const isForeign = (o: (typeof region)[number]) =>
    o.collectionId === null || !memberIds.has(o.collectionId);
  const before = region.find((o) => parseInt(o.id) === start - 1);
  const inDrop = region.filter((o) => parseInt(o.id) >= start && isForeign(o));
  const foreign = inDrop.map((o) => parseInt(o.id)).sort((a, b) => a - b);
  const siblings = inDrop
    .filter(
      (o) =>
        o.season === key.season &&
        o.artist === key.artist &&
        o.onOffline === "offline" &&
        o.collectionNo?.endsWith("A"),
    )
    .map((o) => parseInt(o.id))
    .sort((a, b) => a - b);

  // collection rows appear at a member's first mint, so a row count is a minted count
  const others = await indexer
    .select({ size: sql<number>`count(*)::int` })
    .from(collections)
    .where(
      and(
        eq(collections.season, key.season),
        eq(collections.artist, key.artist),
        eq(collections.onOffline, "offline"),
        like(collections.collectionNo, "%A"),
        ne(collections.collectionNo, key.collectionNo),
      ),
    )
    .groupBy(collections.collectionNo);

  return {
    members,
    region: { start, memberTokens: members.map((m) => m.tokens), foreign, readUntil, siblings },
    pinned: before !== undefined && isForeign(before),
    complete: rosterComplete(
      members.length,
      others.map((o) => o.size),
    ),
  };
}

/**
 * The collections' minted tokens, sorted, with their stored batches (or
 * `override`'s), keeping only collections with a mint, in token order.
 */
async function mintedMembers<R extends { id: string; batches: Batch[] | null }>(
  rows: R[],
  override?: { collectionId: string; batches: Batch[] },
) {
  const minted = await indexer
    .select({ id: objekts.id, collectionId: objekts.collectionId })
    .from(objekts)
    .where(
      inArray(
        objekts.collectionId,
        rows.map((r) => r.id),
      ),
    );
  const tokensOf = new Map<string, number[]>();
  for (const o of minted) {
    if (o.collectionId === null) continue;
    const list = tokensOf.get(o.collectionId) ?? [];
    list.push(parseInt(o.id));
    tokensOf.set(o.collectionId, list);
  }
  return rows
    .map((r) => ({
      ...r,
      batches: override?.collectionId === r.id ? override.batches : (r.batches ?? []),
      tokens: (tokensOf.get(r.id) ?? []).sort((a, b) => a - b),
    }))
    .filter((m) => m.tokens.length > 0)
    .sort((a, b) => a.tokens[0]! - b.tokens[0]!);
}

/** A drop loaded and fitted: every slot size that fits, and the grid when exactly one does. */
export async function fitDrop(key: DropKey, override?: { collectionId: string; batches: Batch[] }) {
  const drop = await loadDrop(key, override);
  if (!drop) return { drop: null, slots: [], grid: null };
  const { slots, grid } = fitDropGrid(drop.region);
  return { drop, slots, grid };
}

/** The token span of a grid-fitted drop, from the stored batches, else null. */
export type DropSpanOf = (key: DropKey) => Promise<{ start: number; end: number } | null>;

/** A DropSpanOf that loads and fits each drop once. */
export function dropSpanMemo(): DropSpanOf {
  const seen = new Map<string, ReturnType<DropSpanOf>>();
  return (key) => {
    const name = `${key.season}|${key.collectionNo}|${key.artist}`;
    let span = seen.get(name);
    if (!span) {
      span = fitDrop(key).then(({ drop, grid }) =>
        drop && grid ? { start: drop.region.start, end: grid.end } : null,
      );
      seen.set(name, span);
    }
    return span;
  };
}

export type MemberKey = Omit<DropKey, "collectionNo"> & { member: string };

export type MemberRun = {
  members: DropMember[];
  region: DropRegion;
  // the token right before the start is a minted Z-collection token
  pinned: boolean;
  // a collection of the run sits in a grid-fitted drop, which keeps precedence
  heldByDrop: boolean;
};

/**
 * One member's runs in one block season: their A collections in token order,
 * split wherever another A collection's minted token sits between two of them
 * or more than MAX_SLOT tokens part them. Only runs of two or more come back.
 * `override` stands in for one collection's stored batches while they are
 * being rewritten.
 */
export async function loadMemberRuns(
  key: MemberKey,
  override?: { collectionId: string; batches: Batch[] },
  dropSpanOf: DropSpanOf = dropSpanMemo(),
): Promise<MemberRun[]> {
  if (preBlockSeasons.includes(key.season)) return [];
  const rows = await indexer
    .select({
      id: collections.id,
      slug: collections.slug,
      collectionNo: collections.collectionNo,
      batches: collections.serialBatches,
    })
    .from(collections)
    .where(
      and(
        eq(collections.season, key.season),
        eq(collections.artist, key.artist),
        eq(collections.member, key.member),
        eq(collections.onOffline, "offline"),
        like(collections.collectionNo, "%A"),
      ),
    );
  if (rows.length < 2) return [];

  const ordered = await mintedMembers(rows, override);

  const groups: (typeof ordered)[] = [];
  for (const m of ordered) {
    const run = groups.at(-1);
    const prev = run?.at(-1);
    if (run && prev && (await joinsRun(prev.tokens.at(-1)!, m.tokens[0]!))) run.push(m);
    else groups.push([m]);
  }

  const runs: MemberRun[] = [];
  for (const members of groups) {
    if (members.length < 2) continue;
    const first = members[0]!;
    const start = Math.min(first.tokens[0]!, ...first.batches.map((b) => b.start));
    const highest = Math.max(...members.map((m) => m.tokens.at(-1)!));
    const readUntil = Math.min(highest, start + members.length * MAX_SLOT) + MAX_SLOT;

    const ids = new Set(members.map((m) => m.id));
    const region = await indexer
      .select({
        id: objekts.id,
        collectionId: objekts.collectionId,
        collectionNo: collections.collectionNo,
      })
      .from(objekts)
      .leftJoin(collections, eq(collections.id, objekts.collectionId))
      .where(tokenIdRange(start - 1, readUntil));
    const before = region.find((o) => parseInt(o.id) === start - 1);
    const foreign = region
      .filter(
        (o) => parseInt(o.id) >= start && (o.collectionId === null || !ids.has(o.collectionId)),
      )
      .map((o) => parseInt(o.id))
      .sort((a, b) => a - b);

    let heldByDrop = false;
    for (const m of members) {
      if (
        await dropSpanOf({ season: key.season, collectionNo: m.collectionNo, artist: key.artist })
      ) {
        heldByDrop = true;
        break;
      }
    }

    runs.push({
      members: members.map(({ collectionNo: _, ...m }) => m),
      region: { start, memberTokens: members.map((m) => m.tokens), foreign, readUntil },
      pinned: before?.collectionNo != null && /z$/i.test(before.collectionNo),
      heldByDrop,
    });
  }
  return runs;
}

// two of a member's collections are neighbours in a run when no other A
// collection minted between them
async function joinsRun(prevHighest: number, nextLowest: number) {
  if (nextLowest - prevHighest > MAX_SLOT) return false;
  if (nextLowest - prevHighest <= 1) return true;
  const [between] = await indexer
    .select({ id: objekts.id })
    .from(objekts)
    .innerJoin(collections, eq(collections.id, objekts.collectionId))
    .where(and(tokenIdRange(prevHighest + 1, nextLowest - 1), like(collections.collectionNo, "%A")))
    .limit(1);
  return between === undefined;
}

/** The fitted run holding the collection, with its grid, or null. */
export async function fittedMemberRun(
  key: MemberKey,
  collectionId: string,
  override?: { collectionId: string; batches: Batch[] },
  dropSpanOf?: DropSpanOf,
) {
  const runs = await loadMemberRuns(key, override, dropSpanOf);
  const run = runs.find((r) => r.members.some((m) => m.id === collectionId));
  if (!run || !run.pinned || run.heldByDrop) return null;
  const { grid } = fitMemberRun(run.region);
  return grid ? { ...run, grid } : null;
}
