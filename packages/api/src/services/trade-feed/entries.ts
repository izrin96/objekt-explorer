import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { listEntries, lists } from "@repo/db/schema";
import { and, inArray, isNotNull, sql } from "drizzle-orm";

import { type FeedEntry, tradeableEntries, untradeableKey } from "../../lib/trade-feed";
import { unique } from "../../lib/unique";
import type { ListType } from "../../schemas/list";
import { redis, redisFailOpen } from "../redis";

const POST_FRESH_SECONDS = 60;
/** how long a copy stays stored after its last refresh, to be served stale */
const POST_KEEP_SECONDS = 900;
const POST_REFRESH_CLAIM_SECONDS = 60;

export const feedListColumns = {
  id: lists.id,
  userId: lists.userId,
  slug: lists.slug,
  name: lists.name,
  description: lists.description,
  listType: lists.listType,
  linkedListId: lists.linkedListId,
  matchSale: lists.matchSale,
  matchHave: lists.matchHave,
  takesSwaps: lists.takesSwaps,
  currency: lists.currency,
  isProfileBind: lists.isProfileBind,
  profileAddress: lists.profileAddress,
  profileSlug: lists.profileSlug,
  bumpedAt: lists.bumpedAt,
  updatedAt: lists.updatedAt,
};

export type FeedList = {
  id: number;
  userId: string;
  slug: string;
  name: string;
  description: string | null;
  listType: ListType;
  linkedListId: number | null;
  matchSale: boolean;
  matchHave: boolean;
  takesSwaps: boolean;
  currency: string | null;
  isProfileBind: boolean;
  profileAddress: string | null;
  profileSlug: string | null;
  bumpedAt: string | null;
  updatedAt: string;
};

export type OwnedRef = { userId: string; objektId: string | null; slug: string };
type FailureRow = { u: number; key: string; token: boolean };

/**
 * The have and sale entries their owner can no longer trade, by the rule For you uses: a
 * token held by none of the owner's addresses or not transferable, or a collection with no
 * transferable copy at those addresses. Only failures come back, so a page of large
 * profile-bound lists ships little from the indexer. Keys come from `untradeableKey`.
 */
export async function fetchUntradeable(
  refs: OwnedRef[],
  addressesOf: ReadonlyMap<string, ReadonlySet<string>>,
): Promise<Set<string>> {
  const failed = new Set<string>();
  if (refs.length === 0) return failed;

  const userIds = unique(refs.map((ref) => ref.userId));
  const indexOf = new Map(userIds.map((id, i) => [id, i]));
  const addressPairs = userIds.flatMap((id, i) =>
    Array.from(addressesOf.get(id) ?? [], (address) => [i, address] as const),
  );
  const pairsOf = (pick: (ref: OwnedRef) => string | null) => [
    ...new Map(
      refs.flatMap((ref) => {
        const value = pick(ref);
        const u = indexOf.get(ref.userId)!;
        return value === null ? [] : [[`${u}:${value}`, [u, value] as const]];
      }),
    ).values(),
  ];
  // in id order, so a large list's lookups walk the objekt primary key in order, not at random
  const tokens = pairsOf((ref) => ref.objektId).toSorted(([, a], [, b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  );
  const slugs = pairsOf((ref) => (ref.objektId ? null : ref.slug));

  const result = await indexer.execute<FailureRow>(sql`
    WITH a AS (
      SELECT * FROM unnest(
        ${sql.param(addressPairs.map(([u]) => u))}::int[],
        ${sql.param(addressPairs.map(([, address]) => address))}::text[]
      ) AS a(u, address)
    ),
    t AS (
      SELECT * FROM unnest(
        ${sql.param(tokens.map(([u]) => u))}::int[],
        ${sql.param(tokens.map(([, id]) => id))}::varchar[]
      ) AS t(u, id)
    ),
    c AS (
      SELECT * FROM unnest(
        ${sql.param(slugs.map(([u]) => u))}::int[],
        ${sql.param(slugs.map(([, slug]) => slug))}::text[]
      ) AS c(u, slug)
    )
    SELECT t.u, t.id AS key, true AS token
    FROM t LEFT JOIN objekt o ON o.id = t.id
    WHERE o.id IS NULL
      OR NOT o.transferable
      OR NOT EXISTS (SELECT 1 FROM a WHERE a.u = t.u AND a.address = o.owner)
    UNION ALL
    SELECT c.u, c.slug, false
    FROM c
    WHERE NOT EXISTS (
      SELECT 1 FROM a
      JOIN collection col ON col.slug = c.slug
      JOIN objekt o ON o.collection_id = col.id AND o.owner = a.address
      WHERE a.u = c.u AND o.transferable
    )
  `);

  for (const row of result.rows) {
    const userId = userIds[row.u]!;
    failed.add(
      untradeableKey(
        userId,
        row.token ? { objektId: row.key, slug: "" } : { objektId: null, slug: row.key },
      ),
    );
  }
  return failed;
}

const postKey = (list: Pick<FeedList, "id" | "updatedAt">) =>
  `trade:post:3:${list.id}:${list.updatedAt}`;

type StoredPost = { at: number; entries: FeedEntry[] };

function parseStored(json: string | null): StoredPost | undefined {
  if (!json) return undefined;
  try {
    const stored = JSON.parse(json) as Partial<StoredPost> | null;
    return typeof stored?.at === "number" && Array.isArray(stored.entries)
      ? (stored as StoredPost)
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Stage 2: each list's shown entries, have and sale narrowed to what the owner can still
 * trade. Keyed by `updated_at`, so an entry edit shows at once and a sale within
 * `POST_FRESH_SECONDS`. With `stale`, a copy past that is still returned and refreshed in the
 * background, since the ownership check on a large profile-bound list takes seconds.
 */
export async function fetchPostEntries(
  feedLists: Pick<FeedList, "id" | "userId" | "listType" | "updatedAt">[],
  addressesOf: ReadonlyMap<string, ReadonlySet<string>>,
  { stale = false }: { stale?: boolean } = {},
): Promise<Map<number, FeedEntry[]>> {
  const result = new Map<number, FeedEntry[]>();
  const cached = await Promise.all(
    feedLists.map((list) => redisFailOpen("trade post", () => redis.get(postKey(list)))),
  );

  const now = Date.now();
  const misses: typeof feedLists = [];
  const expired: typeof feedLists = [];
  feedLists.forEach((list, i) => {
    const stored = parseStored(cached[i] ?? null);
    if (!stored) return misses.push(list);
    const fresh = now - stored.at <= POST_FRESH_SECONDS * 1000;
    if (!fresh && !stale) return misses.push(list);
    result.set(list.id, stored.entries);
    if (!fresh) expired.push(list);
  });

  if (expired.length > 0) {
    // a failed refresh leaves the stale copy; its claim holds the next try off for a minute
    void refreshPostEntries(expired, addressesOf).catch((error: unknown) => {
      console.warn(`[trade post] refresh of ${expired.length} lists failed`, error);
    });
  }
  if (misses.length === 0) return result;
  for (const [id, entries] of await computePostEntries(misses, addressesOf)) {
    result.set(id, entries);
  }
  return result;
}

/** Refreshes the lists no other request is refreshing, across processes. */
async function refreshPostEntries(
  feedLists: Pick<FeedList, "id" | "userId" | "listType" | "updatedAt">[],
  addressesOf: ReadonlyMap<string, ReadonlySet<string>>,
) {
  const claims = await Promise.all(
    feedLists.map((list) =>
      redisFailOpen("trade post", () =>
        redis.send("SET", [
          `${postKey(list)}:refresh`,
          "1",
          "NX",
          "EX",
          String(POST_REFRESH_CLAIM_SECONDS),
        ]),
      ),
    ),
  );
  const claimed = feedLists.filter((_, i) => claims[i] !== null);
  if (claimed.length > 0) await computePostEntries(claimed, addressesOf);
}

async function computePostEntries(
  feedLists: Pick<FeedList, "id" | "userId" | "listType" | "updatedAt">[],
  addressesOf: ReadonlyMap<string, ReadonlySet<string>>,
): Promise<Map<number, FeedEntry[]>> {
  // stamped before the reads, so a slow check does not stretch the copy's fresh window
  const at = Date.now();
  const rows = await db
    .select({
      listId: listEntries.listId,
      id: listEntries.id,
      slug: listEntries.collectionSlug,
      objektId: listEntries.objektId,
      ruleId: listEntries.ruleId,
    })
    .from(listEntries)
    .where(
      and(
        inArray(
          listEntries.listId,
          feedLists.map((list) => list.id),
        ),
        isNotNull(listEntries.collectionSlug),
      ),
    );

  const byList = new Map<number, FeedEntry[]>();
  for (const row of rows) {
    const entries = byList.get(row.listId) ?? [];
    entries.push({
      id: row.id,
      slug: row.slug!,
      objektId: row.objektId,
      ...(row.ruleId !== null && { ruleId: row.ruleId }),
    });
    byList.set(row.listId, entries);
  }

  const untradeable = await fetchUntradeable(
    feedLists
      .filter((list) => list.listType !== "want")
      .flatMap((list) =>
        (byList.get(list.id) ?? []).map((entry) => ({
          userId: list.userId,
          objektId: entry.objektId,
          slug: entry.slug,
        })),
      ),
    addressesOf,
  );

  const result = new Map<number, FeedEntry[]>();
  await Promise.all(
    feedLists.map((list) => {
      const entries = byList.get(list.id) ?? [];
      const shown =
        list.listType === "want" ? entries : tradeableEntries(entries, list.userId, untradeable);
      result.set(list.id, shown);
      const stored: StoredPost = { at, entries: shown };
      return redisFailOpen("trade post", () =>
        redis.set(postKey(list), JSON.stringify(stored), "EX", POST_KEEP_SECONDS),
      );
    }),
  );
  return result;
}
