import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections } from "@repo/db/indexer/schema";
import { listEntries, lists, user, userAddress } from "@repo/db/schema";
import { tradeVersionKey } from "@repo/lib/server/list-touch";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { type SQL, and, eq, inArray, isNotNull, ne, sql } from "drizzle-orm";

import { isMessageable, toMessagePref } from "../lib/chat-rules";
import { iso } from "../lib/time";
import {
  assemblePost,
  BUMP_COOLDOWN_HOURS,
  comparePosts,
  type FeedEntry,
  FEED_FETCH_SIZE,
  FEED_PAGE_SIZE,
  isPostIdle,
  latest,
  nextBumpAt,
  pairPosts,
  type PostTag,
  tradeableEntries,
  untradeableKey,
  type Viewer,
} from "../lib/trade-feed";
import {
  collectionVerdict,
  groupBySlug,
  IDLE_DAYS,
  toPartnerIdentity,
  addressesByUser,
} from "../lib/trade-rank";
import type { ListTypeNew } from "../schemas/list";
import type { BrowseFilters, FeedCursor, PostType } from "../schemas/trade";
import { getCollectionFilters } from "./activity-feed";
import {
  fetchCollectionsBySlug,
  findOwnedList,
  resolveDiscoverable,
  touchList,
  tradeColumns,
} from "./list";
import { toPublicUser } from "./profile";
import { getCache, redis } from "./redis";
import { reputationOf } from "./reputation";
import { notBlockedEither, notTradeSanctioned } from "./safety";
import { marketVersion } from "./safety-cache";
import { offersOnTrade, takesPartInTrade, takesPartInTradeSql } from "./trade-lists";
import { fetchHoldings } from "./trade-matches";

const POST_TTL_SECONDS = 60;
const HAVE_TTL_SECONDS = 300;
const COUNTS_TTL_SECONDS = 60;

const TRADE_TYPES = ["have", "want", "sale"] as const satisfies ListTypeNew[];
const isTradeType = (type: ListTypeNew): type is (typeof TRADE_TYPES)[number] =>
  (TRADE_TYPES as readonly ListTypeNew[]).includes(type);

const TAG_TYPE: Record<PostTag, ListTypeNew> = { wtt: "have", wtb: "want", wts: "sale" };

const unique = <T>(values: T[]) => [...new Set(values)];

/**
 * Posts on Trade: each list on Trade, with a want list folded into the have list that links
 * to it when both are on Trade. A post's bump and change times are the latest of its lists.
 */
const postsCte = sql`
  on_trade AS (
    SELECT id, user_id, list_type_new, linked_list_id, bumped_at, updated_at, created_at
    FROM lists
    WHERE discoverable AND ${takesPartInTradeSql()}
  ),
  posts AS (
    SELECT
      a.id,
      a.user_id,
      a.list_type_new AS type,
      p.id AS partner_id,
      -- milliseconds, so the ISO cursor names a row exactly; a post never bumped sorts by its
      -- last change
      date_trunc(
        'milliseconds',
        coalesce(greatest(a.bumped_at, p.bumped_at), greatest(a.updated_at, p.updated_at))
      ) AS bumped_at,
      greatest(a.updated_at, p.updated_at) AS updated_at
    FROM on_trade a
    LEFT JOIN on_trade p
      ON a.list_type_new = 'have'
      AND p.id = a.linked_list_id
      AND p.list_type_new = 'want'
      AND p.user_id = a.user_id
    WHERE NOT EXISTS (
      SELECT 1 FROM on_trade h
      WHERE a.list_type_new = 'want'
        AND h.list_type_new = 'have'
        AND h.linked_list_id = a.id
        AND h.user_id = a.user_id
    )
  )
`;

const listedPost = sql`greatest(posts.bumped_at, posts.updated_at) > now() - make_interval(days => ${IDLE_DAYS})`;

const hasEntryIn = (listIds: SQL, slugs: string[]) =>
  sql`EXISTS (
    SELECT 1 FROM list_entries e
    WHERE e.list_id IN (${listIds}) AND e.collection_slug = ANY(${sql.param(slugs)}::text[])
  )`;

type FeedRow = {
  id: number;
  partner_id: number | null;
  cursor_at: string;
  message_allow: string | null;
};

type Stage1 = {
  viewerId: string | null;
  type: PostType;
  slugs: string[] | null;
  slug: string | null;
  cursor: FeedCursor | undefined;
};

/** Stage 1: which posts make the page, in order. Uncached; it reads only the partial index's rows. */
async function fetchFeedRows(query: Stage1): Promise<FeedRow[]> {
  const where: SQL[] = [listedPost, notTradeSanctioned(sql`posts.user_id`)];
  if (query.viewerId !== null) {
    where.push(sql`posts.user_id <> ${query.viewerId}`);
    where.push(notBlockedEither(query.viewerId, sql`posts.user_id`));
    where.push(sql`NOT EXISTS (
      SELECT 1 FROM hidden_trade_partner h
      WHERE h.user_id = ${query.viewerId} AND h.hidden_user_id = posts.user_id
    )`);
  }
  if (query.type !== "all") where.push(sql`posts.type = ${TAG_TYPE[query.type]}`);
  if (query.slugs) where.push(hasEntryIn(sql`posts.id, posts.partner_id`, query.slugs));
  if (query.slug !== null) where.push(hasEntryIn(sql`posts.id, posts.partner_id`, [query.slug]));
  if (query.cursor) {
    where.push(
      sql`(posts.bumped_at, posts.id) < (${query.cursor.bumpedAt}::timestamptz, ${query.cursor.id})`,
    );
  }

  const result = await db.execute<FeedRow>(sql`
    WITH ${postsCte}
    SELECT
      posts.id,
      posts.partner_id,
      posts.bumped_at::text AS cursor_at,
      mp.allow AS message_allow
    FROM posts
    LEFT JOIN message_pref mp ON mp.user_id = posts.user_id
    WHERE ${sql.join(where, sql` AND `)}
    ORDER BY posts.bumped_at DESC, posts.id DESC
    LIMIT ${FEED_FETCH_SIZE}
  `);
  return result.rows;
}

const feedListColumns = {
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

type FeedList = {
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

type AddressRow = {
  userId: string | null;
  address: string;
  nickname: string | null;
};

function fetchAddresses(userIds: string[]): Promise<AddressRow[]> {
  if (userIds.length === 0) return Promise.resolve([]);
  return db
    .select({
      userId: userAddress.userId,
      address: userAddress.address,
      nickname: userAddress.nickname,
    })
    .from(userAddress)
    .where(inArray(userAddress.userId, userIds));
}

type OwnedRef = { userId: string; objektId: string | null; slug: string };
type FailureRow = { u: number; key: string; token: boolean };

/**
 * The have and sale entries their owner can no longer trade, by the rule For you uses: a
 * token held by none of the owner's addresses or not transferable, or a collection with no
 * transferable copy at those addresses. Only failures come back, so a page of large
 * profile-bound lists ships little from the indexer. Keys come from `untradeableKey`.
 */
async function fetchUntradeable(
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
async function fetchPostEntries(
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

/**
 * Collections on the user's bound have lists that they can still trade, with the lists that
 * can trade each; never the whole wallet.
 */
async function computeHaveIndex(userId: string): Promise<[string, number[]][]> {
  const [entries, addressRows] = await Promise.all([
    db
      .select({
        listId: listEntries.listId,
        slug: listEntries.collectionSlug,
        objektId: listEntries.objektId,
      })
      .from(listEntries)
      .innerJoin(lists, eq(lists.id, listEntries.listId))
      .where(and(eq(lists.userId, userId), offersOnTrade, isNotNull(listEntries.collectionSlug))),
    fetchAddresses([userId]),
  ]);
  if (entries.length === 0) return [];

  const addresses = addressesByUser(addressRows).get(userId) ?? new Set<string>();
  const owned = entries.map((entry) => ({
    listId: entry.listId,
    slug: entry.slug!,
    objektId: entry.objektId,
  }));
  const holdings = await fetchHoldings(
    unique(owned.flatMap((entry) => (entry.objektId ? [entry.objektId] : []))),
    unique(owned.flatMap((entry) => (entry.objektId ? [] : [entry.slug]))),
    [...addresses],
  );

  return [...groupBySlug(owned)].flatMap(([slug, group]) => {
    const { verdict, listIds } = collectionVerdict(group, addresses, holdings);
    return verdict === "ok" ? [[slug, listIds] as [string, number[]]] : [];
  });
}

async function fetchViewer(userId: string): Promise<Viewer> {
  const version = (await redis.get(tradeVersionKey(userId))) ?? "0";
  const [have, wantRows] = await Promise.all([
    getCache(`trade:have-lists:${userId}:${version}`, HAVE_TTL_SECONDS, () =>
      computeHaveIndex(userId),
    ),
    db
      .selectDistinct({ listId: listEntries.listId, slug: listEntries.collectionSlug })
      .from(listEntries)
      .innerJoin(lists, eq(lists.id, listEntries.listId))
      .where(
        and(
          eq(lists.userId, userId),
          eq(lists.listTypeNew, "want"),
          isNotNull(listEntries.collectionSlug),
        ),
      ),
  ]);
  const want = new Map<string, number[]>();
  for (const row of wantRows) {
    const listIds = want.get(row.slug!);
    if (listIds) listIds.push(row.listId);
    else want.set(row.slug!, [row.listId]);
  }
  return { have: new Map(have), want };
}

/** The shared collection filters as slugs, resolved in the indexer; null when none is set. */
async function resolveFilterSlugs(filters: BrowseFilters): Promise<string[] | null> {
  const predicates = getCollectionFilters(filters);
  if (predicates.length === 0) return null;
  const rows = await indexer
    .select({ slug: collections.slug })
    .from(collections)
    .where(and(ne(collections.slug, "empty-collection"), ...predicates));
  return rows.map((row) => row.slug);
}

function toListLink(list: FeedList, nicknameOf: ReadonlyMap<string, string | null>) {
  const address = list.profileAddress?.toLowerCase() ?? null;
  return {
    id: list.id,
    slug: list.slug,
    name: list.name,
    description: list.description,
    listTypeNew: list.listTypeNew,
    currency: list.currency,
    profileSlug: list.profileSlug,
    profile: address ? { address, nickname: nicknameOf.get(address) ?? null } : null,
  };
}

export async function browseFeed(
  viewerId: string | null,
  input: BrowseFilters & { cursor?: FeedCursor },
) {
  const [viewer, slugs] = await Promise.all([
    viewerId === null ? null : fetchViewer(viewerId),
    resolveFilterSlugs(input),
  ]);

  const empty = { posts: [], nextCursor: undefined, collections: {} };
  if (slugs?.length === 0) return empty;

  const rows = await fetchFeedRows({
    viewerId,
    type: input.type,
    slugs,
    slug: input.slug ?? null,
    cursor: input.cursor,
  });
  if (rows.length === 0) return empty;

  const listIds = rows.flatMap((row) => (row.partner_id ? [row.id, row.partner_id] : [row.id]));
  const feedLists = await db.select(feedListColumns).from(lists).where(inArray(lists.id, listIds));
  const listById = new Map(feedLists.map((list) => [list.id, list]));
  const ownerIds = unique(feedLists.map((list) => list.userId));

  const [users, addressRows, reputations] = await Promise.all([
    db.select().from(user).where(inArray(user.id, ownerIds)),
    fetchAddresses(ownerIds),
    reputationOf(ownerIds),
  ]);
  const addressesOf = addressesByUser(addressRows);
  const userMap = new Map(users.map((u) => [u.id, u]));
  const nicknameOf = new Map(addressRows.map((row) => [row.address.toLowerCase(), row.nickname]));

  const filter = {
    slugs: slugs ? new Set(slugs) : null,
    slug: input.slug ?? null,
  };

  const membersOf = (row: FeedRow) =>
    [row.id, row.partner_id].flatMap((id) => {
      const list = id === null ? undefined : listById.get(id);
      return list ? [list] : [];
    });

  // stage 2 fills only the rows the page still needs; the over-fetched rest is read only
  // when ownership empties posts and the page comes up short
  const posts = [];
  let last: FeedRow | undefined;
  let examined = 0;
  while (posts.length < FEED_PAGE_SIZE && examined < rows.length) {
    const batch = rows.slice(examined, examined + FEED_PAGE_SIZE - posts.length);
    examined += batch.length;
    const entriesOf = await fetchPostEntries(batch.flatMap(membersOf), addressesOf);

    for (const row of batch) {
      last = row;
      const members = membersOf(row);
      const [post] = pairPosts(members);
      const account = userMap.get(post?.anchor.userId ?? "");
      if (!post || !account) continue;

      const assembled = assemblePost(post, (id) => entriesOf.get(id) ?? [], viewer, filter);
      if (!assembled) continue;

      posts.push({
        id: post.anchor.id,
        tag: post.tag,
        userId: account.id,
        user: toPublicUser(account),
        reputation: reputations.get(account.id) ?? null,
        identity: toPartnerIdentity(
          account.name,
          members.map((list) => ({ profileAddress: list.profileAddress, matches: 0 })),
          addressRows.filter((a) => a.userId === account.id),
        ),
        bumpedAt: iso(post.bumpedAt),
        updatedAt: iso(post.updatedAt)!,
        sides: assembled.sides.map((side) => ({
          role: side.role,
          list: toListLink(side.list, nicknameOf),
          items: side.items,
          more: side.more,
        })),
        match: assembled.match,
        messageable: isMessageable(toMessagePref({ allow: row.message_allow })),
      });
    }
  }

  const drawn = unique(
    posts.flatMap((post) => post.sides.flatMap((s) => s.items.map((i) => i.slug))),
  );
  const collectionRows = await fetchCollectionsBySlug(drawn, []);

  const hasMore = examined < rows.length || rows.length === FEED_FETCH_SIZE;
  return {
    posts,
    nextCursor: hasMore && last ? { bumpedAt: iso(last.cursor_at)!, id: last.id } : undefined,
    collections: Object.fromEntries(collectionRows.map((c) => [c.slug, c])) as Record<
      string,
      ValidObjekt
    >,
  };
}

async function fetchOwnTradeLists(userId: string) {
  return db
    .select(feedListColumns)
    .from(lists)
    .where(and(eq(lists.userId, userId), eq(lists.discoverable, true), takesPartInTrade));
}

export async function fetchMyPosts(userId: string) {
  const now = new Date();
  const posts = pairPosts(await fetchOwnTradeLists(userId)).toSorted(comparePosts);
  return posts.map((post) => ({
    id: post.anchor.id,
    slug: post.anchor.slug,
    tag: post.tag,
    lists: [post.have, post.want, post.sale].flatMap((list) =>
      list ? [{ slug: list.slug, name: list.name, listTypeNew: list.listTypeNew }] : [],
    ),
    listed: !isPostIdle(post, now),
    bumpedAt: iso(post.bumpedAt),
    updatedAt: iso(post.updatedAt)!,
    nextBumpAt: nextBumpAt(post.bumpedAt, now),
  }));
}

/**
 * One statement: the post's lists are bumped together, or not at all. The row-level
 * cooldown check is what EvalPlanQual re-reads under a concurrent bump; the NOT EXISTS
 * covers the pair partner bumped more recently.
 */
export async function bumpPost(userId: string, slug: string) {
  const result = await db.execute<{ id: number; bumped_at: string }>(sql`
    WITH target AS (
      SELECT id, list_type_new, linked_list_id FROM lists
      WHERE slug = ${slug} AND user_id = ${userId} AND discoverable
    ),
    members AS (
      SELECT id FROM target
      UNION
      SELECT l.id FROM lists l, target t
      WHERE l.discoverable AND l.user_id = ${userId}
        AND (
          (t.list_type_new = 'have' AND l.list_type_new = 'want' AND l.id = t.linked_list_id)
          OR (t.list_type_new = 'want' AND l.list_type_new = 'have' AND l.linked_list_id = t.id)
        )
    )
    UPDATE lists SET bumped_at = now()
    WHERE id IN (SELECT id FROM members)
      AND user_id = ${userId}
      AND discoverable
      AND (bumped_at IS NULL OR bumped_at <= now() - make_interval(hours => ${BUMP_COOLDOWN_HOURS}))
      AND NOT EXISTS (
        SELECT 1 FROM lists x
        WHERE x.id IN (SELECT id FROM members)
          AND x.bumped_at > now() - make_interval(hours => ${BUMP_COOLDOWN_HOURS})
      )
    RETURNING id, bumped_at::text
  `);

  const now = new Date();
  const bumped = latest(...result.rows.map((row) => row.bumped_at));
  if (bumped !== null) return { bumpedAt: iso(bumped)!, nextBumpAt: nextBumpAt(bumped, now) };

  const own = await fetchOwnTradeLists(userId);
  const post = pairPosts(own).find((p) =>
    [p.have, p.want, p.sale].some((list) => list?.slug === slug),
  );
  if (!post) throw new ORPCError("NOT_FOUND");
  throw new ORPCError("TOO_MANY_REQUESTS", {
    data: { nextBumpAt: nextBumpAt(post.bumpedAt, now) },
  });
}

type ShowOnTradeRefusal = "not_tradeable" | "needs_profile";

export async function setShowOnTrade(userId: string, slug: string, on: boolean) {
  const list = await findOwnedList(slug, userId);
  if (!isTradeType(list.listTypeNew)) {
    throw new ORPCError("BAD_REQUEST", {
      data: { reason: "not_tradeable" satisfies ShowOnTradeRefusal },
    });
  }
  if (on && !resolveDiscoverable(list.listTypeNew, list.isProfileBind, true)) {
    throw new ORPCError("BAD_REQUEST", {
      data: { reason: "needs_profile" satisfies ShowOnTradeRefusal },
    });
  }

  const [saved] = await db
    .update(lists)
    .set(tradeColumns(on))
    .where(eq(lists.id, list.id))
    .returning({
      discoverable: lists.discoverable,
      bumpedAt: lists.bumpedAt,
    });
  if (!saved) throw new ORPCError("NOT_FOUND");
  await touchList([list.id]);
  return { ...saved, bumpedAt: iso(saved.bumpedAt) };
}

type CountRow = {
  post_id: number;
  user_id: string;
  list_type_new: ListTypeNew;
  objekt_id: string | null;
};

async function computePostCounts(slug: string) {
  const result = await db.execute<CountRow>(sql`
    WITH ${postsCte}
    SELECT posts.id AS post_id, posts.user_id, t.list_type_new, e.objekt_id
    FROM posts
    JOIN list_entries e ON e.list_id IN (posts.id, posts.partner_id)
    JOIN on_trade t ON t.id = e.list_id
    WHERE e.collection_slug = ${slug} AND ${listedPost} AND ${notTradeSanctioned(sql`posts.user_id`)}
  `);

  const owned = result.rows.filter((row) => row.list_type_new !== "want");
  const refs = owned.map((row) => ({ userId: row.user_id, objektId: row.objekt_id, slug }));
  const untradeable = await fetchUntradeable(
    refs,
    addressesByUser(await fetchAddresses(unique(owned.map((row) => row.user_id)))),
  );
  const havePosts = new Set(
    owned
      .filter((row, i) => !untradeable.has(untradeableKey(row.user_id, refs[i]!)))
      .map((row) => row.post_id),
  );
  const wantPosts = new Set(
    result.rows.filter((row) => row.list_type_new === "want").map((row) => row.post_id),
  );
  return { have: havePosts.size, want: wantPosts.size };
}

export async function collectionPostCounts(slug: string) {
  const version = await marketVersion();
  return getCache(`trade:counts:${version}:${slug}`, COUNTS_TTL_SECONDS, () =>
    computePostCounts(slug),
  );
}
