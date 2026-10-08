import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections } from "@repo/db/indexer/schema";
import { lists, user } from "@repo/db/schema";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { and, eq, inArray, ne, sql } from "drizzle-orm";

import { isMessageable, toMessagePref } from "../../lib/chat-rules";
import { iso } from "../../lib/time";
import {
  assemblePost,
  BUMP_COOLDOWN_HOURS,
  comparePosts,
  FEED_FETCH_SIZE,
  FEED_PAGE_SIZE,
  isPostIdle,
  latest,
  matchesViewer,
  nextBumpAt,
  pairPosts,
  untradeableKey,
} from "../../lib/trade-feed";
import { toPartnerIdentity, addressesByUser, nicknamesByAddress } from "../../lib/trade-rank";
import { unique } from "../../lib/unique";
import type { ListTypeNew } from "../../schemas/list";
import type { BrowseFilters, FeedCursor } from "../../schemas/trade";
import { getCollectionFilters } from "../activity-feed";
import {
  fetchCollectionsBySlug,
  findOwnedList,
  resolveDiscoverable,
  touchList,
  tradeColumns,
} from "../list";
import { toPublicUser } from "../profile";
import { getCache } from "../redis";
import { reputationOf } from "../reputation";
import { notTradeSanctioned } from "../safety";
import { marketVersion } from "../safety-cache";
import { takesPartInTrade } from "../trade-lists";
import { fetchAddresses } from "../trade-matches/holdings";
import { type FeedList, feedListColumns, fetchPostEntries, fetchUntradeable } from "./entries";
import { type FeedRow, fetchFeedRows, listedPost, postsCte } from "./query";
import { fetchViewer, hasTradeList } from "./viewer";

const COUNTS_TTL_SECONDS = 60;

const TRADE_TYPES = ["have", "want", "sale"] as const satisfies ListTypeNew[];
const isTradeType = (type: ListTypeNew): type is (typeof TRADE_TYPES)[number] =>
  (TRADE_TYPES as readonly ListTypeNew[]).includes(type);

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
  const [viewer, slugs, takesPart] = await Promise.all([
    viewerId === null ? null : fetchViewer(viewerId),
    resolveFilterSlugs(input),
    viewerId !== null && input.matches === true ? hasTradeList(viewerId) : false,
  ]);

  const empty = { posts: [], nextCursor: undefined, collections: {} };
  if (slugs?.length === 0) return empty;

  // the switch shows on the same test, so a stale `matches=1` from a viewer with no list on
  // Trade lists every post; a list that matches nothing yet empties the feed
  const onlyMatches = takesPart && viewer !== null;
  if (onlyMatches && viewer!.have.size === 0 && viewer!.want.size === 0) return empty;

  const rows = await fetchFeedRows({
    viewerId,
    type: input.type,
    slugs,
    slug: input.slug ?? null,
    matches: onlyMatches
      ? { want: [...viewer!.want.keys()], have: [...viewer!.have.keys()] }
      : null,
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
  const nicknameOf = nicknamesByAddress(addressRows);

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
      // SQL can't see that an owner sold the only matching objekt
      if (onlyMatches && !matchesViewer(assembled.match)) continue;

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
