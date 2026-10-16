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
  type FeedPhase,
  type FeedPlan,
  feedPlan,
  fillPage,
  isPostIdle,
  isSectioned,
  latest,
  mergeSeen,
  matchIndexOf,
  matchesViewer,
  narrowViewer,
  nextBumpAt,
  pairPosts,
  type PhaseRead,
  phaseScope,
  previewSide,
  type SeenPeople,
  untradeableKey,
  type Viewer,
} from "../../lib/trade-feed";
import {
  addressesByUser,
  mutualRankOf,
  nicknamesByAddress,
  oneWayRankOf,
  peopleAfter,
  toPartnerIdentity,
} from "../../lib/trade-rank";
import { unique } from "../../lib/unique";
import type { PostCardView } from "../../schemas/chat";
import type { ListTypeNew } from "../../schemas/list";
import type { BrowseFilters, BrowseMatchMode, FeedCursor } from "../../schemas/trade";
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
import { getOneWayPeople } from "../trade-matches/one-way";
import { type PersonMatch, personMatches } from "../trade-matches/person";
import { type FeedList, feedListColumns, fetchPostEntries, fetchUntradeable } from "./entries";
import { type FeedRow, fetchFeedRows, listedPost, postsCte } from "./query";
import { loadScope, saveScope, scopeToken } from "./scope";
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

type Ranked = Awaited<ReturnType<typeof getOneWayPeople>>;

type FeedContext = {
  viewerId: string | null;
  viewer: Viewer | null;
  input: BrowseFilters & { cursor?: FeedCursor };
  mode: BrowseMatchMode;
  slugs: string[] | null;
  match: { userId: string; sides: Sides; compared: Viewer } | null;
  plan: FeedPlan;
  mutual: Ranked;
  oneWay: Ranked;
  seen: SeenPeople;
};

type PostRank = Pick<FeedCursor, "rank" | "oneWay">;

/** The two phases that page by a ranking of people: who is ranked, where a cursor resumes, what it keeps. */
const RANKED_PHASES = {
  mutual: {
    people: (ctx: FeedContext) => ctx.mutual,
    rankOf: (person: Ranked[number]): PostRank => ({ rank: mutualRankOf(person) }),
    resumeAt: (cursor: FeedCursor | undefined) => cursor?.rank,
  },
  oneWay: {
    people: (ctx: FeedContext) => ctx.oneWay,
    rankOf: (person: Ranked[number]): PostRank => ({ oneWay: oneWayRankOf(person) }),
    resumeAt: (cursor: FeedCursor | undefined) => cursor?.oneWay,
  },
} as const;

/** A one-way Compare with list has no Mutual people: Mutual needs both of the viewer's sides. */
async function mutualPeopleOf(match: { userId: string; sides: Sides }) {
  const { haveListIds, wantListIds } = match.sides;
  if (haveListIds.length === 0 || wantListIds.length === 0) return [];
  return getMutualPeople(match.userId, match.sides);
}

/** Stage 2: the posts of `rows`, up to `need`, with the viewer's rings and counts. */
async function loadPosts(ctx: FeedContext, rows: FeedRow[], need: number) {
  const { viewerId, viewer, input, match, slugs } = ctx;
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
  const narrowed = filter.slugs !== null || filter.slug !== null || filter.onlyMatches;

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
  while (posts.length < need && examined < rows.length) {
    const batch = rows.slice(examined, examined + need - posts.length);
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
        narrowed,
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
  return { posts, last, examined };
}

type PostRows = Awaited<ReturnType<typeof loadPosts>>["posts"];

const NO_ROWS: PhaseRead<never, FeedCursor> = { posts: [], dry: true, last: undefined };

/** One phase's share of a page: its people (when it pages by a ranking), its rows, and its posts. */
async function readPhase(
  ctx: FeedContext,
  phase: FeedPhase,
  need: number,
): Promise<PhaseRead<PostRows[number], Pick<FeedCursor, "bumpedAt" | "id" | "rank" | "oneWay">>> {
  const { viewerId, input, match, mode, slugs, plan } = ctx;
  const cursor = phase === plan.phases[0] ? input.cursor : undefined;

  let owners: { ids: string[]; resume: boolean } | null = null;
  let rankOf = new Map<string, PostRank>();
  if (phase === "mutual" || phase === "oneWay") {
    const spec = RANKED_PHASES[phase];
    const ordered = spec.people(ctx);
    rankOf = new Map(ordered.map((person) => [person.userId, spec.rankOf(person)]));
    const resumed = spec.resumeAt(cursor);
    const people = resumed ? peopleAfter(ordered, resumed) : ordered;
    const [first] = people;
    if (!first) return NO_ROWS;
    owners = {
      ids: people.map((person) => person.userId),
      resume: resumed !== undefined && first.userId === resumed.userId,
    };
  }

  const rows = await fetchFeedRows({
    viewerId,
    // Mutual is a swap between two people, so it lists WTT posts whatever the client asks
    type: phase === "mutual" || mode === "mutual" ? "wtt" : input.type,
    slugs,
    slug: input.slug ?? null,
    matches: match ? matchIndexOf(match.compared) : null,
    owners,
    cursor,
    ...phaseScope(phase, plan, ctx.seen),
  });
  if (rows.length === 0) return NO_ROWS;

  const { posts, last, examined } = await loadPosts(ctx, rows, need);
  return {
    posts,
    dry: examined >= rows.length && rows.length < FEED_FETCH_SIZE,
    last: last && { bumpedAt: iso(last.cursor_at)!, id: last.id, ...rankOf.get(last.user_id) },
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
  let match: FeedContext["match"] = null;
  if (takesPart && viewer !== null && viewerId !== null) {
    const sides = await resolveCompareSides(viewerId, input.list, mode === "mutual");
    const compared = narrowViewer(viewer, sides);
    if (compared.have.size === 0 && compared.want.size === 0) return empty;
    match = { userId: viewerId, sides, compared };
  }

  const plan = feedPlan(match ? mode : "off", input.type, input.cursor);
  const sectioned = isSectioned(plan.phases);
  const [mutual, oneWay, snapshot] = await Promise.all([
    match && (plan.mutualOwned || plan.phases.includes("mutual")) ? mutualPeopleOf(match) : [],
    match && sectioned ? getOneWayPeople(match.userId, match.sides) : [],
    viewerId !== null && input.cursor?.scope ? loadScope(viewerId, input.cursor.scope) : undefined,
  ]);
  const seen = mergeSeen(snapshot, {
    mutual: mutual.map((person) => person.userId),
    oneWay: oneWay.map((person) => person.userId),
  });

  const ctx: FeedContext = {
    viewerId,
    viewer,
    input,
    mode,
    slugs,
    match,
    plan,
    mutual,
    oneWay,
    seen,
  };
  const page = await fillPage(plan.phases, FEED_PAGE_SIZE, (phase, need) =>
    readPhase(ctx, phase, need),
  );

  const drawn = unique(
    page.posts.flatMap((post) => post.sides.flatMap((s) => s.items.map((i) => i.slug))),
  );
  const collectionRows = await fetchCollectionsBySlug(drawn, []);

  let scope: string | undefined;
  if (sectioned && page.next && viewerId !== null) {
    scope = scopeToken(seen);
    if (scope !== input.cursor?.scope) await saveScope(viewerId, scope, seen);
  }

  return {
    posts: page.posts.map(({ phase, ...post }) => ({
      ...post,
      section: sectioned
        ? phase === "mutual"
          ? ("mutual" as const)
          : ("oneWay" as const)
        : undefined,
    })),
    nextCursor: page.next && {
      ...page.next.last,
      ...(sectioned
        ? { phase: page.next.phase === "bump" ? undefined : page.next.phase, scope }
        : {}),
    },
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
