import { ORPCError } from "@orpc/server";
import { validArtists } from "@repo/cosmo/types/common";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections } from "@repo/db/indexer/schema";
import { listEntries, lists, user } from "@repo/db/schema";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { and, eq, inArray, isNotNull, ne, or, sql } from "drizzle-orm";

import { isMessageable, toMessagePref } from "../../lib/chat-rules";
import { iso } from "../../lib/time";
import {
  assemblePost,
  browseMode,
  BUMP_COOLDOWN_HOURS,
  comparePosts,
  FEED_FETCH_SIZE,
  FEED_PAGE_SIZE,
  isPostIdle,
  latest,
  matchIndexOf,
  matchesViewer,
  narrowViewer,
  nextBumpAt,
  pairPosts,
  previewSide,
  untradeableKey,
  type Viewer,
} from "../../lib/trade-feed";
import {
  addressesByUser,
  mutualRankOf,
  nicknamesByAddress,
  peopleAfter,
  toPartnerIdentity,
} from "../../lib/trade-rank";
import { unique } from "../../lib/unique";
import type { PostCardView } from "../../schemas/chat";
import type { ListTypeNew } from "../../schemas/list";
import type { BrowseFilters, FeedCursor, MutualRank } from "../../schemas/trade";
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
import { notBlockedEither, notTradeSanctioned } from "../safety";
import { marketVersion } from "../safety-cache";
import { takesPartInTrade } from "../trade-lists";
import { resolveCompareSides, type Sides } from "../trade-matches";
import { fetchAddresses } from "../trade-matches/holdings";
import { getMutualPeople } from "../trade-matches/mutual";
import { type PersonMatch, personMatches } from "../trade-matches/person";
import { type FeedList, feedListColumns, fetchPostEntries, fetchUntradeable } from "./entries";
import { type FeedRow, fetchFeedRows, listedPost, postsCte } from "./query";
import { fetchViewer, hasTradeList } from "./viewer";

const COUNTS_TTL_SECONDS = 60;

const POST_CARD_LIMIT = 6;

const TRADE_TYPES = ["have", "want", "sale"] as const satisfies ListTypeNew[];
const isTradeType = (type: ListTypeNew): type is (typeof TRADE_TYPES)[number] =>
  (TRADE_TYPES as readonly ListTypeNew[]).includes(type);

/**
 * The shared collection filters as slugs, resolved in the indexer; null when none is set. An
 * artist filter naming every artist leaves no collection out, so it is not one.
 */
async function resolveFilterSlugs(filters: BrowseFilters): Promise<string[] | null> {
  const coversEveryArtist = validArtists.every((artist) => filters.artist.includes(artist));
  const predicates = getCollectionFilters(coversEveryArtist ? { ...filters, artist: [] } : filters);
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
  const mode = browseMode(input);
  const [viewer, slugs, takesPart] = await Promise.all([
    viewerId === null ? null : fetchViewer(viewerId),
    resolveFilterSlugs(input),
    viewerId !== null && mode !== "off" ? hasTradeList(viewerId) : false,
  ]);

  const empty = { posts: [], nextCursor: undefined, collections: {} };
  if (slugs?.length === 0) return empty;

  // the control shows on the same test, so a stale `match` from a viewer with no list on
  // Trade lists every post; a list that matches nothing yet empties the feed
  let match: { userId: string; sides: Sides; compared: Viewer } | null = null;
  if (takesPart && viewer !== null && viewerId !== null) {
    const sides = await resolveCompareSides(viewerId, input.list, mode === "mutual");
    const compared = narrowViewer(viewer, sides);
    if (compared.have.size === 0 && compared.want.size === 0) return empty;
    match = { userId: viewerId, sides, compared };
  }

  let owners: { ids: string[]; resume: boolean } | null = null;
  let rankOf = new Map<string, MutualRank>();
  if (match && mode === "mutual") {
    const ordered = await getMutualPeople(match.userId, match.sides);
    rankOf = new Map(ordered.map((partner) => [partner.userId, mutualRankOf(partner)]));
    const cursorRank = input.cursor?.rank;
    const people = cursorRank ? peopleAfter(ordered, cursorRank) : ordered;
    const [first] = people;
    if (!first) return empty;
    owners = {
      ids: people.map((partner) => partner.userId),
      resume: cursorRank !== undefined && first.userId === cursorRank.userId,
    };
  }

  const rows = await fetchFeedRows({
    viewerId,
    // Mutual is a swap between two people, so it lists WTT posts whatever the client asks
    type: mode === "mutual" ? "wtt" : input.type,
    slugs,
    slug: input.slug ?? null,
    matches: match ? matchIndexOf(match.compared) : null,
    owners,
    cursor: input.cursor,
  });
  if (rows.length === 0) return empty;

  const listIds = rows.flatMap((row) => (row.partner_id ? [row.id, row.partner_id] : [row.id]));
  const feedLists = await db.select(feedListColumns).from(lists).where(inArray(lists.id, listIds));
  const listById = new Map(feedLists.map((list) => [list.id, list]));
  const ownerIds = unique(feedLists.map((list) => list.userId));

  const [users, addressRows, reputations, persons] = await Promise.all([
    db.select().from(user).where(inArray(user.id, ownerIds)),
    fetchAddresses(ownerIds),
    reputationOf(ownerIds),
    viewerId === null
      ? new Map<string, PersonMatch>()
      : personMatches(viewerId, ownerIds, match?.sides),
  ]);
  const addressesOf = addressesByUser(addressRows);
  const userMap = new Map(users.map((u) => [u.id, u]));
  const nicknameOf = nicknamesByAddress(addressRows);

  const filter = {
    slugs: slugs ? new Set(slugs) : null,
    slug: input.slug ?? null,
    onlyMatches: match !== null,
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

      const assembled = assemblePost(
        post,
        (id) => entriesOf.get(id) ?? [],
        match?.compared ?? viewer,
        filter,
      );
      if (!assembled) continue;
      // SQL can't see that an owner sold the only matching objekt
      if (match && !matchesViewer(assembled.match)) continue;

      posts.push({
        id: post.anchor.id,
        tag: post.tag,
        buyingOnly: post.buyingOnly,
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
          copyCount: side.copyCount,
          others: side.others,
        })),
        match: assembled.match,
        person: persons.get(account.id),
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
    nextCursor:
      hasMore && last
        ? { bumpedAt: iso(last.cursor_at)!, id: last.id, rank: rankOf.get(last.user_id) }
        : undefined,
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

type PostCardPost = NonNullable<PostCardView["post"]>;

/**
 * Posts as a chat card draws them, by the id of the list the card was sent from; a list that is
 * gone, or no longer shown on Trade, maps to null. A card's list is either half of a pair: the
 * post is the one that holds it now, so a want list later linked to a have list shows that post.
 */
export async function fetchPostCards(
  listIds: number[],
  viewerId: string | null,
): Promise<Map<number, PostCardPost | null>> {
  const result = new Map<number, PostCardPost | null>(listIds.map((id) => [id, null]));
  if (listIds.length === 0) return result;

  const named = await db
    .select({ id: lists.id, linkedListId: lists.linkedListId })
    .from(lists)
    .where(inArray(lists.id, listIds));
  const partnerIds = named.flatMap((list) =>
    list.linkedListId === null ? [] : [list.linkedListId],
  );
  const owned = await db
    .select(feedListColumns)
    .from(lists)
    .where(
      and(
        or(inArray(lists.id, [...listIds, ...partnerIds]), inArray(lists.linkedListId, listIds)),
        eq(lists.discoverable, true),
        takesPartInTrade,
        notTradeSanctioned(sql`${lists.userId}`),
        viewerId === null ? undefined : notBlockedEither(viewerId, sql`${lists.userId}`),
      ),
    );
  const posts = pairPosts(owned);
  const found = listIds.flatMap((id) => {
    const post = posts.find((p) => [p.have, p.want, p.sale].some((list) => list?.id === id));
    return post ? [{ id, post }] : [];
  });
  if (found.length === 0) return result;

  const members = found.flatMap(({ post }) =>
    [post.have, post.want, post.sale].flatMap((list) => (list ? [list] : [])),
  );
  const ownerIds = unique(members.map((list) => list.userId));
  const saleIds = members.filter((list) => list.listTypeNew === "sale").map((list) => list.id);
  const [accounts, addressRows, priceRows] = await Promise.all([
    db.select().from(user).where(inArray(user.id, ownerIds)),
    fetchAddresses(ownerIds),
    saleIds.length === 0
      ? []
      : db
          .select({
            listId: listEntries.listId,
            min: sql<number>`min(${listEntries.price})`,
            max: sql<number>`max(${listEntries.price})`,
          })
          .from(listEntries)
          .where(
            and(
              inArray(listEntries.listId, saleIds),
              isNotNull(listEntries.price),
              eq(listEntries.isQyop, false),
            ),
          )
          .groupBy(listEntries.listId),
  ]);
  const entriesOf = await fetchPostEntries(members, addressesByUser(addressRows));
  const accountOf = new Map(accounts.map((account) => [account.id, account]));
  const nicknameOf = nicknamesByAddress(addressRows);
  const priceOf = new Map(priceRows.map((row) => [row.listId, row]));

  const side = (list: FeedList | null) => {
    if (!list) return null;
    const { items, more } = previewSide(entriesOf.get(list.id) ?? [], null, POST_CARD_LIMIT);
    return { slugs: items.map((item) => item.slug), more };
  };

  for (const { id, post } of found) {
    const account = accountOf.get(post.anchor.userId);
    if (!account) continue;
    // a sale list never pairs with a want list, so a sale post's price stands where Wants would
    const price = post.sale ? priceOf.get(post.sale.id) : undefined;
    const address = post.anchor.profileAddress?.toLowerCase() ?? null;
    result.set(id, {
      tag: post.tag,
      owner: {
        userId: account.id,
        name: toPartnerIdentity(
          account.name,
          [post.have, post.want, post.sale].flatMap((list) =>
            list ? [{ profileAddress: list.profileAddress, matches: 0 }] : [],
          ),
          addressRows.filter((row) => row.userId === account.id),
        ).name,
      },
      list: {
        id: post.anchor.id,
        slug: post.anchor.slug,
        name: post.anchor.name,
        profileSlug: post.anchor.profileSlug,
        profile: address ? { address, nickname: nicknameOf.get(address) ?? null } : null,
      },
      has: side(post.have ?? post.sale),
      wants: side(post.want),
      price:
        price && post.sale?.currency
          ? { min: Number(price.min), max: Number(price.max), currency: post.sale.currency }
          : null,
    });
  }
  return result;
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
