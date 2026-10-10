import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { listEntries, lists } from "@repo/db/schema";
import { and, inArray, isNotNull, sql } from "drizzle-orm";

import { type FeedEntry, tradeableEntries, untradeableKey } from "../../lib/trade-feed";
import { unique } from "../../lib/unique";
import type { ListTypeNew } from "../../schemas/list";
import { redis } from "../redis";

const POST_TTL_SECONDS = 60;

export const feedListColumns = {
  id: lists.id,
  userId: lists.userId,
  slug: lists.slug,
  name: lists.name,
  description: lists.description,
  listTypeNew: lists.listTypeNew,
  linkedListId: lists.linkedListId,
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
  listTypeNew: ListTypeNew;
  linkedListId: number | null;
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
  const tokens = pairsOf((ref) => ref.objektId);
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
  `trade:post:${list.id}:${list.updatedAt}`;

/**
 * Stage 2: each list's shown entries, have and sale narrowed to what the owner can still
 * trade. Keyed by `updated_at`, so an entry edit shows at once and a sale within the TTL.
 */
export async function fetchPostEntries(
  feedLists: Pick<FeedList, "id" | "userId" | "listTypeNew" | "updatedAt">[],
  addressesOf: ReadonlyMap<string, ReadonlySet<string>>,
): Promise<Map<number, FeedEntry[]>> {
  const result = new Map<number, FeedEntry[]>();
  const cached = await Promise.all(feedLists.map((list) => redis.get(postKey(list))));

  const misses = feedLists.filter((list, i) => {
    const hit = cached[i];
    if (!hit) return true;
    try {
      result.set(list.id, JSON.parse(hit) as FeedEntry[]);
      return false;
    } catch {
      return true;
    }
  });
  if (misses.length === 0) return result;

  const rows = await db
    .select({
      listId: listEntries.listId,
      id: listEntries.id,
      slug: listEntries.collectionSlug,
      objektId: listEntries.objektId,
      price: listEntries.price,
      isQyop: listEntries.isQyop,
    })
    .from(listEntries)
    .where(
      and(
        inArray(
          listEntries.listId,
          misses.map((list) => list.id),
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
      price: row.price,
      isQyop: row.isQyop,
    });
    byList.set(row.listId, entries);
  }

  const untradeable = await fetchUntradeable(
    misses
      .filter((list) => list.listTypeNew !== "want")
      .flatMap((list) =>
        (byList.get(list.id) ?? []).map((entry) => ({
          userId: list.userId,
          objektId: entry.objektId,
          slug: entry.slug,
        })),
      ),
    addressesOf,
  );

  await Promise.all(
    misses.map((list) => {
      const entries = byList.get(list.id) ?? [];
      const shown =
        list.listTypeNew === "want" ? entries : tradeableEntries(entries, list.userId, untradeable);
      result.set(list.id, shown);
      return redis.set(postKey(list), JSON.stringify(shown), "EX", POST_TTL_SECONDS);
    }),
  );
  return result;
}
