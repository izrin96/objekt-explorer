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
  fullSide,
  listMatchesOf,
  isPostIdle,
  latest,
  matchesViewer,
  narrowViewer,
  nearOf,
  nextBumpAt,
  pickerTags,
  pairPosts,
  previewSide,
  untradeableKey,
  type Viewer,
} from "../../lib/trade-feed";
import { addressesByUser, nicknamesByAddress, toPartnerIdentity } from "../../lib/trade-rank";
import { unique } from "../../lib/unique";
import type { PostCardView } from "../../schemas/chat";
import type { CollectionFilters } from "../../schemas/common/filters";
import type { ListType } from "../../schemas/list";
import { type BrowseFilters, type SideItemsInput } from "../../schemas/trade";
import { postKindOf } from "../../schemas/trade-post";
import { getCollectionFilters } from "../activity-feed";
import { fetchCollectionsBySlug } from "../list";
import { fetchRulesById } from "../list-rules";
import { toPublicUser } from "../profile";
import { getCache } from "../redis";
import { reputationOf } from "../reputation";
import { notBlockedEither, notTradeSanctioned } from "../safety";
import { marketVersion } from "../safety-cache";
import { takesPartInTrade, takesPartInTradeSql } from "../trade-lists";
import { resolveCompareSides, type Sides } from "../trade-matches";
import { fetchAddresses } from "../trade-matches/holdings";
import { getMutualPeople } from "../trade-matches/mutual";
import { type PersonMatch, personMatches } from "../trade-matches/person";
import { type FeedList, feedListColumns, fetchPostEntries, fetchUntradeable } from "./entries";
import { type FeedRow, listedPost, postsCte } from "./query";
import { fetchViewer, hasTradeList } from "./viewer";

const COUNTS_TTL_SECONDS = 60;

/** a new collection reaches a filtered feed within this */
const FILTER_SLUGS_TTL_SECONDS = 300;

const POST_CARD_LIMIT = 6;

const TRADE_TYPES = ["have", "want", "sale"] as const satisfies ListType[];
const isTradeType = (type: ListType): type is (typeof TRADE_TYPES)[number] =>
  (TRADE_TYPES as readonly ListType[]).includes(type);

/**
 * The shared collection filters as slugs, resolved in the indexer; null when none is set. An
 * artist filter naming every artist leaves no collection out, so it is not one.
 */
async function resolveFilterSlugs(filters: BrowseFilters): Promise<string[] | null> {
  const coversEveryArtist = validArtists.every((artist) => filters.artist.includes(artist));
  const facets: CollectionFilters = {
    artist: coversEveryArtist ? [] : filters.artist,
    member: filters.member,
    season: filters.season,
    class: filters.class,
    on_offline: filters.on_offline,
    collection: filters.collection,
  };
  const predicates = getCollectionFilters(facets);
  if (predicates.length === 0) return null;
  // every page of a filtered feed asks again, and an artist alone can mean thousands of slugs
  const sorted = Object.values(facets).map((values) =>
    values.toSorted((a, b) => a.localeCompare(b)),
  );
  const key = new Bun.CryptoHasher("sha1").update(JSON.stringify(sorted)).digest("hex");
  return getCache(`trade:filter-slugs:1:${key}`, FILTER_SLUGS_TTL_SECONDS, async () => {
    const rows = await indexer
      .select({ slug: collections.slug })
      .from(collections)
      .where(and(ne(collections.slug, "empty-collection"), ...predicates));
    return rows.map((row) => row.slug);
  });
}

function toListLink(list: FeedList, nicknameOf: ReadonlyMap<string, string | null>) {
  const address = list.profileAddress?.toLowerCase() ?? null;
  return {
    id: list.id,
    slug: list.slug,
    name: list.name,
    description: list.description,
    listType: list.listType,
    currency: list.currency,
    profileSlug: list.profileSlug,
    profile: address ? { address, nickname: nicknameOf.get(address) ?? null } : null,
  };
}

type FeedMatch = { userId: string; sides: Sides; compared: Viewer };

/** A one-way Compare with list has no Mutual people: Mutual needs both of the viewer's sides. */
export async function mutualPeopleOf(match: { userId: string; sides: Sides }) {
  const { haveListIds, wantListIds } = match.sides;
  if (haveListIds.length === 0 || wantListIds.length === 0) return [];
  return getMutualPeople(match.userId, match.sides);
}

/** Stage 2: the posts of `rows`, up to `need`, with the viewer's rings and counts. */
export type LoadContext = {
  viewerId: string | null;
  viewer: Viewer | null;
  match: FeedMatch | null;
  slugs: string[] | null;
  input: Pick<BrowseFilters, "slug">;
};

export async function loadPosts(ctx: LoadContext, rows: FeedRow[], need: number) {
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
  // each owner's lists with the matches of the posts shown, to head the person
  const identityLists = new Map<string, { profileAddress: string | null; matches: number }[]>();
  let last: FeedRow | undefined;
  let examined = 0;
  while (posts.length < need && examined < rows.length) {
    const batch = rows.slice(examined, examined + need - posts.length);
    examined += batch.length;
    const entriesOf = await fetchPostEntries(batch.flatMap(membersOf), addressesOf, {
      stale: true,
    });
    const ruleDefs = await fetchRulesById(
      unique([
        ...[...entriesOf.values()].flat().flatMap((entry) => entry.ruleId ?? []),
        ...[...(viewer?.ruleWant?.values() ?? [])].flat().map((rule) => rule.ruleId),
      ]),
    );

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

      const matches = assembled.match ? assembled.match.youHave + assembled.match.youWant : 0;
      const owned = identityLists.get(account.id) ?? [];
      owned.push(...members.map((list) => ({ profileAddress: list.profileAddress, matches })));
      identityLists.set(account.id, owned);

      posts.push({
        id: post.anchor.id,
        tags: post.tags,
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
          collectionCount: side.collectionCount,
          rules: side.rules.flatMap((tile) => {
            const rule = ruleDefs.get(tile.ruleId);
            if (!rule) return [];
            // signed out, there is no one to count for
            return [
              {
                ...tile,
                rule,
                matched: viewer ? tile.matched : null,
                matchedSlugs: viewer ? tile.matchedSlugs : [],
              },
            ];
          }),
          near: side.near,
        })),
        match: assembled.match,
        // the viewer's own rules, by the slugs they matched; For you names them under the strips
        ruleMatches: (assembled.ruleMatches ?? []).flatMap((found) => {
          const rule = ruleDefs.get(found.ruleId);
          return rule ? [{ ...found, rule }] : [];
        }),
        person: persons.get(account.id),
        messageable: isMessageable(toMessagePref({ allow: row.message_allow })),
      });
    }
  }
  const identities = new Map(
    [...identityLists].map(([ownerId, owned]) => [
      ownerId,
      toPartnerIdentity(
        userMap.get(ownerId)!.name,
        owned,
        addressRows.filter((a) => a.userId === ownerId),
      ),
    ]),
  );
  return { posts, last, examined, identities };
}

/** The viewer's side of a feed read, or null when nothing can be listed. */
export async function resolveFeed(viewerId: string | null, input: BrowseFilters) {
  const mode = browseMode(input);
  const [viewer, slugs, takesPart] = await Promise.all([
    viewerId === null ? null : fetchViewer(viewerId),
    resolveFilterSlugs(input),
    viewerId !== null && mode !== "off" ? hasTradeList(viewerId) : false,
  ]);
  if (slugs?.length === 0) return null;

  // the control shows on the same test, so a stale `match` from a viewer with no list on
  // Trade lists every post; a list that matches nothing yet empties the feed
  let match: FeedMatch | null = null;
  if (takesPart && viewer !== null && viewerId !== null) {
    const sides = await resolveCompareSides(viewerId, input.list, mode === "mutual");
    const compared = narrowViewer(viewer, sides);
    if (compared.have.size === 0 && compared.want.size === 0) return null;
    match = { userId: viewerId, sides, compared };
  }
  return { mode, viewer, slugs, match };
}

async function fetchOwnTradeLists(userId: string) {
  return db
    .select(feedListColumns)
    .from(lists)
    .where(and(eq(lists.userId, userId), eq(lists.discoverable, true), takesPartInTrade));
}

export async function fetchMyPosts(userId: string) {
  const now = new Date();
  const [own, lastBump] = await Promise.all([fetchOwnTradeLists(userId), lastBumpOf(userId)]);
  const next = nextBumpAt(lastBump, now);
  // every post carries the person's last and next bump
  return pairPosts(own)
    .toSorted(comparePosts)
    .map((post) => ({
      id: post.anchor.id,
      slug: post.anchor.slug,
      tags: post.tags,
      kind: postKindOf(post).kind,
      alsoPay: postKindOf(post).alsoPay,
      lists: [post.have, post.sale, post.want].flatMap((list) =>
        list
          ? [
              {
                slug: list.slug,
                name: list.name,
                listType: list.listType,
                role: list.listType as "have" | "want" | "sale",
              },
            ]
          : [],
      ),
      listed: !isPostIdle(post, now),
      bumpedAt: iso(post.bumpedAt),
      updatedAt: iso(post.updatedAt)!,
      lastBumpAt: iso(lastBump),
      nextBumpAt: next,
    }));
}

/** A list the viewer may see on Trade: shown there, its owner not trade-sanctioned, no block either way. */
const visibleOnTrade = (viewerId: string | null) =>
  and(
    eq(lists.discoverable, true),
    takesPartInTrade,
    notTradeSanctioned(sql`${lists.userId}`),
    viewerId === null ? undefined : notBlockedEither(viewerId, sql`${lists.userId}`),
  );

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
        visibleOnTrade(viewerId),
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
  const saleIds = members.filter((list) => list.listType === "sale").map((list) => list.id);
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
    // a chat card draws objekts only; a rule's entries stay on the post
    const { items, more, copyCount } = previewSide(
      (entriesOf.get(list.id) ?? []).filter((entry) => entry.ruleId === undefined),
      null,
      POST_CARD_LIMIT,
    );
    return { slugs: items.map((item) => item.slug), more, copyCount };
  };

  for (const { id, post } of found) {
    const account = accountOf.get(post.anchor.userId);
    if (!account) continue;
    // a sale list never pairs with a want list, so a sale post's price stands where Wants would
    const price = post.sale ? priceOf.get(post.sale.id) : undefined;
    const address = post.anchor.profileAddress?.toLowerCase() ?? null;
    result.set(id, {
      tag: post.tag,
      tags: post.tags,
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

/** A list on Trade the viewer may see: not gone, off Trade, sanctioned or blocked either way. */
async function findTradeList(viewerId: string | null, listId: number) {
  const [list] = await db
    .select(feedListColumns)
    .from(lists)
    .where(and(eq(lists.id, listId), visibleOnTrade(viewerId)));
  if (!list || !isTradeType(list.listType)) throw new ORPCError("NOT_FOUND");
  return { ...list, listType: list.listType };
}

/** A list's shown entries: have and sale narrowed to what the owner can still trade. */
async function tradeEntriesOf(list: FeedList) {
  const addressRows = await fetchAddresses([list.userId]);
  const entriesOf = await fetchPostEntries([list], addressesByUser(addressRows));
  return entriesOf.get(list.id) ?? [];
}

/**
 * One side of a post on Trade, every objekt of it, ringed against the viewer as the feed rings it:
 * by Compare with's lists when `list` is given, and not at all on the owner's own list. Not
 * found when the list is gone, off Trade, or hidden from the viewer.
 */
export async function fetchSideItems(viewerId: string | null, input: SideItemsInput) {
  const list = await findTradeList(viewerId, input.listId);
  const ringing = viewerId !== null && viewerId !== list.userId;
  const [entries, viewer, sides] = await Promise.all([
    tradeEntriesOf(list),
    ringing ? fetchViewer(viewerId) : null,
    ringing && input.list ? resolveCompareSides(viewerId, input.list, input.mutual ?? false) : null,
  ]);
  const side = fullSide(
    list.listType,
    list,
    entries,
    viewer && sides ? narrowViewer(viewer, sides) : viewer,
  );
  const collectionRows = await fetchCollectionsBySlug(
    side.items.map((item) => item.slug),
    [],
  );
  return {
    ...side,
    collections: Object.fromEntries(collectionRows.map((c) => [c.slug, c])) as Record<
      string,
      ValidObjekt
    >,
  };
}

/** A person's lists the viewer sees on Trade, in posts still listed: those their strips draw. */
async function listedTradeLists(viewerId: string, personId: string) {
  const rows = await db
    .select(feedListColumns)
    .from(lists)
    .where(and(eq(lists.userId, personId), visibleOnTrade(viewerId)));
  const now = new Date();
  return pairPosts(rows)
    .filter((post) => !isPostIdle(post, now))
    .flatMap((post) =>
      [post.have, post.sale, post.want].flatMap((list) =>
        list && isTradeType(list.listType) ? [{ ...list, listType: list.listType }] : [],
      ),
    );
}

/**
 * A person's near matches to the viewer, as their strips show them: for each of their lists on
 * Trade, or only those `listIds` names, its role, verb and collections, with the viewer's lists
 * behind each. `sides` narrows the viewer to Compare with's lists.
 */
export async function personNear(
  viewerId: string,
  personId: string,
  sides: Sides | null,
  listIds?: ReadonlySet<number>,
) {
  const tradeLists = (await listedTradeLists(viewerId, personId)).filter(
    (list) => !listIds || listIds.has(list.id),
  );
  if (tradeLists.length === 0) return [];
  const [addressRows, viewer] = await Promise.all([
    fetchAddresses([personId]),
    fetchViewer(viewerId),
  ]);
  const entriesOf = await fetchPostEntries(tradeLists, addressesByUser(addressRows));
  const narrowed = sides ? narrowViewer(viewer, sides) : viewer;
  return tradeLists.flatMap((list) => {
    const near = nearOf(list.listType, list, entriesOf.get(list.id) ?? [], narrowed);
    return near ? [{ listId: list.id, role: list.listType, ...near }] : [];
  });
}

/**
 * The offer picker's tags for the viewer's copies, giving (against the person's want lists), or
 * the person's, asking (against their have and sale lists), by `pickerTags`.
 */
export async function pickerTagsFor(
  viewerId: string,
  personId: string,
  direction: "give" | "get",
  slugs: readonly string[],
) {
  if (slugs.length === 0) return {};
  const sideLists = (await listedTradeLists(viewerId, personId)).filter(
    (list) => (list.listType === "want") === (direction === "give"),
  );
  if (sideLists.length === 0) return {};
  const [addressRows, viewer] = await Promise.all([
    fetchAddresses([personId]),
    fetchViewer(viewerId),
  ]);
  const entriesOf = await fetchPostEntries(sideLists, addressesByUser(addressRows));
  return pickerTags(
    slugs,
    sideLists.map((list) => ({
      role: list.listType,
      list,
      entries: (entriesOf.get(list.id) ?? []).filter((entry) => entry.ruleId === undefined),
    })),
    viewer,
    direction,
  );
}

/** Which of a list's collections match the viewer's lists, and which of theirs: none on their own. */
export async function fetchListMatches(viewerId: string, listId: number) {
  const list = await findTradeList(viewerId, listId);
  if (list.userId === viewerId) return { slugs: [], listIds: [], near: null };
  const [entries, viewer] = await Promise.all([tradeEntriesOf(list), fetchViewer(viewerId)]);
  return listMatchesOf(list.listType, list, entries, viewer);
}

/**
 * Market's Show my matches: the collections on the viewer's want lists that a listing answers,
 * those open to buying, as a sale list rings them, with the lists each is on.
 */
export async function fetchMarketMatches(viewerId: string) {
  const viewer = await fetchViewer(viewerId);
  return { want: Object.fromEntries(viewer.saleWant) as Record<string, number[]> };
}

async function lastBumpOf(userId: string) {
  const [row] = await db
    .select({ at: sql<string | null>`max(${lists.bumpedAt})::text` })
    .from(lists)
    .where(eq(lists.userId, userId));
  return row?.at ?? null;
}

/**
 * One statement: every post on Trade is bumped together, or none. The row-level cooldown check is
 * what EvalPlanQual re-reads under a concurrent bump; the NOT EXISTS covers the person's other
 * lists, Trade or not, bumped more recently.
 */
export async function bumpPerson(userId: string) {
  const result = await db.execute<{ bumped_at: string }>(sql`
    UPDATE lists SET bumped_at = now()
    WHERE user_id = ${userId}
      AND discoverable
      AND ${takesPartInTradeSql()}
      AND (bumped_at IS NULL OR bumped_at <= now() - make_interval(hours => ${BUMP_COOLDOWN_HOURS}))
      AND NOT EXISTS (
        SELECT 1 FROM lists x
        WHERE x.user_id = ${userId}
          AND x.bumped_at > now() - make_interval(hours => ${BUMP_COOLDOWN_HOURS})
      )
    RETURNING bumped_at::text
  `);

  const now = new Date();
  const bumped = latest(...result.rows.map((row) => row.bumped_at));
  if (bumped !== null) return { bumpedAt: iso(bumped)!, nextBumpAt: nextBumpAt(bumped, now) };

  const next = nextBumpAt(await lastBumpOf(userId), now);
  if (next === null) throw new ORPCError("NOT_FOUND");
  throw new ORPCError("TOO_MANY_REQUESTS", { data: { nextBumpAt: next } });
}

type CountRow = {
  post_id: number;
  user_id: string;
  list_type: ListType;
  objekt_id: string | null;
};

async function computePostCounts(slug: string) {
  const result = await db.execute<CountRow>(sql`
    WITH ${postsCte}
    SELECT posts.id AS post_id, posts.user_id, t.list_type, e.objekt_id
    FROM posts
    JOIN list_entries e ON e.list_id IN (posts.id, posts.partner_id)
    JOIN on_trade t ON t.id = e.list_id
    WHERE e.collection_slug = ${slug} AND ${listedPost} AND ${notTradeSanctioned(sql`posts.user_id`)}
  `);

  const owned = result.rows.filter((row) => row.list_type !== "want");
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
    result.rows.filter((row) => row.list_type === "want").map((row) => row.post_id),
  );
  return { have: havePosts.size, want: wantPosts.size };
}

export async function collectionPostCounts(slug: string) {
  const version = await marketVersion();
  return getCache(`trade:counts:${version}:${slug}`, COUNTS_TTL_SECONDS, () =>
    computePostCounts(slug),
  );
}
