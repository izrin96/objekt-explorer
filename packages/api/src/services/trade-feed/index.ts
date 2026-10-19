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
  EXTRA_PEOPLE_READS,
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
  peopleScope,
  type PhaseRead,
  phaseScope,
  previewSide,
  readBatches,
  readBudget,
  type ReadBudget,
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
  resumeRanking,
  toPartnerIdentity,
} from "../../lib/trade-rank";
import { unique } from "../../lib/unique";
import type { PostCardView } from "../../schemas/chat";
import type { CollectionFilters } from "../../schemas/common/filters";
import type { ListTypeNew } from "../../schemas/list";
import {
  type BrowseFilters,
  type BrowseMatchMode,
  type FeedCursor,
  PEOPLE_PAGE_SIZE,
  type PeopleCursor,
  type PeopleInput,
} from "../../schemas/trade";
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
import { takesPartInTrade, takesPartInTradeSql } from "../trade-lists";
import { resolveCompareSides, type Sides } from "../trade-matches";
import { fetchAddresses } from "../trade-matches/holdings";
import { getMutualPeople } from "../trade-matches/mutual";
import { getOneWayPeople } from "../trade-matches/one-way";
import { type PersonMatch, personMatches } from "../trade-matches/person";
import { type FeedList, feedListColumns, fetchPostEntries, fetchUntradeable } from "./entries";
import {
  type FeedQuery,
  type FeedRow,
  fetchBumpPeople,
  fetchFeedOwners,
  fetchFeedRows,
  fetchPersonRows,
  listedPost,
  postsCte,
} from "./query";
import { loadScope, saveScope, scopeToken } from "./scope";
import { fetchViewer, hasTradeList } from "./viewer";

const COUNTS_TTL_SECONDS = 60;

/** a new collection reaches a filtered feed within this */
const FILTER_SLUGS_TTL_SECONDS = 300;

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
    people: (ctx: Pick<FeedContext, "mutual" | "oneWay">) => ctx.mutual,
    rankOf: (person: Ranked[number]): PostRank => ({ rank: mutualRankOf(person) }),
    resumeAt: (cursor: Pick<FeedCursor, "rank"> | undefined) => cursor?.rank,
  },
  oneWay: {
    people: (ctx: Pick<FeedContext, "mutual" | "oneWay">) => ctx.oneWay,
    rankOf: (person: Ranked[number]): PostRank => ({ oneWay: oneWayRankOf(person) }),
    resumeAt: (cursor: Pick<FeedCursor, "oneWay"> | undefined) => cursor?.oneWay,
  },
} as const;

/** A one-way Compare with list has no Mutual people: Mutual needs both of the viewer's sides. */
async function mutualPeopleOf(match: { userId: string; sides: Sides }) {
  const { haveListIds, wantListIds } = match.sides;
  if (haveListIds.length === 0 || wantListIds.length === 0) return [];
  return getMutualPeople(match.userId, match.sides);
}

/** Stage 2: the posts of `rows`, up to `need`, with the viewer's rings and counts. */
type LoadContext = Pick<FeedContext, "viewerId" | "viewer" | "match" | "slugs"> & {
  input: Pick<BrowseFilters, "slug">;
};

async function loadPosts(ctx: LoadContext, rows: FeedRow[], need: number) {
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

      const matches = assembled.match ? assembled.match.youHave + assembled.match.youWant : 0;
      const owned = identityLists.get(account.id) ?? [];
      owned.push(...members.map((list) => ({ profileAddress: list.profileAddress, matches })));
      identityLists.set(account.id, owned);

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

/** The viewer's side of a feed read, or null when nothing can be listed. */
async function resolveFeed(viewerId: string | null, input: BrowseFilters) {
  const mode = browseMode(input);
  const [viewer, slugs, takesPart] = await Promise.all([
    viewerId === null ? null : fetchViewer(viewerId),
    resolveFilterSlugs(input),
    viewerId !== null && mode !== "off" ? hasTradeList(viewerId) : false,
  ]);
  if (slugs?.length === 0) return null;

  // the control shows on the same test, so a stale `match` from a viewer with no list on
  // Trade lists every post; a list that matches nothing yet empties the feed
  let match: FeedContext["match"] = null;
  if (takesPart && viewer !== null && viewerId !== null) {
    const sides = await resolveCompareSides(viewerId, input.list, mode === "mutual");
    const compared = narrowViewer(viewer, sides);
    if (compared.have.size === 0 && compared.want.size === 0) return null;
    match = { userId: viewerId, sides, compared };
  }
  return { mode, viewer, slugs, match };
}

export async function browseFeed(
  viewerId: string | null,
  input: BrowseFilters & { cursor?: FeedCursor },
) {
  const empty = { posts: [], nextCursor: undefined, collections: {} };
  const resolved = await resolveFeed(viewerId, input);
  if (!resolved) return empty;
  const { mode, viewer, slugs, match } = resolved;

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
  const page = await fillPage(
    plan.phases,
    FEED_PAGE_SIZE,
    (phase, need) => readPhase(ctx, phase, need),
    (post) => post.id,
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

type PersonPosts = Awaited<ReturnType<typeof loadPosts>>["posts"];

/** A person's row and the newest bump among its posts, which a cursor resumes from. */
type Loaded = {
  person: {
    userId: string;
    identity: ReturnType<typeof toPartnerIdentity>;
    user: PersonPosts[number]["user"];
    reputation: PersonPosts[number]["reputation"];
    messageable: boolean;
    counts: PersonMatch["counts"] | undefined;
    posts: Omit<
      PersonPosts[number],
      "userId" | "user" | "reputation" | "identity" | "person" | "messageable"
    >[];
  };
  newest: string;
};

type PeopleContext = LoadContext &
  Pick<FeedContext, "mode" | "plan" | "mutual" | "oneWay" | "seen"> & {
    input: PeopleInput;
    /** the `person` whose row leads the feed, left out of every phase */
    lead: string | undefined;
    reads: ReadBudget;
    /** the cursor's snapshot of the rankings, when one loaded */
    snapshot: SeenPeople | undefined;
  };

/** The listed people's rows, in `ids` order; a person whose posts all emptied is left out. */
async function loadPeople(ctx: LoadContext, query: FeedQuery, ids: string[]): Promise<Loaded[]> {
  const rows = await fetchPersonRows(query, ids);
  const { posts, identities } = await loadPosts(ctx, rows, rows.length);
  const atOf = new Map(rows.map((row) => [row.id, row.cursor_at]));
  const byUser = Map.groupBy(posts, (post) => post.userId);
  return ids.flatMap((id): Loaded[] => {
    const group = byUser.get(id);
    const first = group?.[0];
    if (!group || !first) return [];
    const newest = group.map((post) => atOf.get(post.id)!).reduce((a, b) => (b > a ? b : a));
    return [
      {
        newest,
        person: {
          userId: id,
          identity: identities.get(id) ?? first.identity,
          user: first.user,
          reputation: first.reputation,
          messageable: first.messageable,
          counts: first.person?.counts,
          posts: group.map(
            ({ userId, user, reputation, identity, person, messageable, ...post }) => post,
          ),
        },
      },
    ];
  });
}

type PeopleLast = Pick<PeopleCursor, "bumpedAt" | "userId" | "rank" | "oneWay">;

/** The stage-1 predicates of a people read; Mutual only and the Mutual section read WTT posts. */
function feedQueryOf(
  ctx: Pick<PeopleContext, "viewerId" | "input" | "slugs" | "match">,
  type: FeedQuery["type"],
): FeedQuery {
  return {
    viewerId: ctx.viewerId,
    type,
    slugs: ctx.slugs,
    slug: ctx.input.slug ?? null,
    matches: ctx.match ? matchIndexOf(ctx.match.compared) : null,
  };
}

/** One phase's share of a page of people, whole rows. */
async function readPeoplePhase(
  ctx: PeopleContext,
  phase: FeedPhase,
  need: number,
): Promise<PhaseRead<Loaded, PeopleLast>> {
  const { input, mode, plan } = ctx;
  const cursor = phase === plan.phases[0] ? input.cursor : undefined;
  // Mutual is a swap between two people, so under Mutual only it lists WTT posts
  const query = feedQueryOf(ctx, mode === "mutual" ? "wtt" : input.type);
  const exclude = peopleScope(phase, ctx.seen, ctx.lead);
  // each read asks only for the room left, so no loaded row is thrown away; a person whose
  // posts all emptied in stage 2 is made up by the next read
  const load = (ids: string[]) => loadPeople(ctx, query, ids);

  if (phase === "bump" || phase === "tail") {
    let after = cursor && { bumpedAt: cursor.bumpedAt, userId: cursor.userId };
    const read = await readBatches({
      need,
      budget: ctx.reads,
      fetch: async (limit) => {
        const found = await fetchBumpPeople(query, {
          limit,
          cursor: after,
          excludeOwners: exclude,
        });
        const rows = found.map((row) => ({ bumpedAt: iso(row.cursor_at)!, userId: row.user_id }));
        after = rows.at(-1) ?? after;
        return { rows, exhausted: found.length < limit };
      },
      load: (rows) => load(rows.map((row) => row.userId)),
    });
    return { posts: read.taken, dry: read.dry, last: read.examined };
  }

  const spec = RANKED_PHASES[phase];
  const skip = new Set(exclude);
  const rankOf = new Map(spec.people(ctx).map((person) => [person.userId, spec.rankOf(person)]));
  // the rankings refresh between pages, so a page goes on in the order earlier pages saw
  const remaining = resumeRanking(
    spec.people(ctx),
    ctx.snapshot ? ctx.seen[phase] : undefined,
    spec.resumeAt(cursor),
  ).filter((person) => !skip.has(person.userId));
  // the Mutual people were checked for a kept WTT post; One way's are checked here, once
  const kept =
    phase === "mutual"
      ? null
      : await fetchFeedOwners(
          query,
          remaining.map((person) => person.userId),
        );
  const eligible = remaining.filter((person) => !kept || kept.has(person.userId));

  let index = 0;
  const read = await readBatches({
    need,
    budget: ctx.reads,
    fetch: async (limit) => {
      const rows = eligible.slice(index, index + limit);
      index += rows.length;
      return { rows, exhausted: index >= eligible.length };
    },
    load: (rows) => load(rows.map((person) => person.userId)),
  });
  const lastTaken = read.taken.at(-1);
  return {
    posts: read.taken,
    dry: read.dry,
    last: read.examined && {
      // only a bump read reads `bumpedAt`, and `feedPlan` never hands it a ranked cursor
      bumpedAt: lastTaken
        ? iso(lastTaken.newest)!
        : (cursor?.bumpedAt ?? new Date(0).toISOString()),
      userId: read.examined.userId,
      ...rankOf.get(read.examined.userId),
    },
  };
}

/**
 * Trade as people: 12 a page, each with every post the feed keeps for them (up to
 * `PERSON_POST_LIMIT`). The phases and their order are `browseFeed`'s; a person sits in one
 * section, and `person` leads the first page with that person's row.
 */
export async function peopleFeed(viewerId: string | null, input: PeopleInput) {
  const empty = { people: [], nextCursor: undefined, collections: {} };
  const resolved = await resolveFeed(viewerId, input);
  if (!resolved) return empty;
  const { mode, viewer, slugs, match } = resolved;

  const lead = input.cursor ? input.cursor.lead : input.person;
  const plan = feedPlan(match ? mode : "off", input.type, input.cursor);
  const sectioned = isSectioned(plan.phases);
  const [ranked, oneWay, snapshot] = await Promise.all([
    match && (plan.mutualOwned || plan.phases.includes("mutual")) ? mutualPeopleOf(match) : [],
    match && sectioned ? getOneWayPeople(match.userId, match.sides) : [],
    viewerId !== null && input.cursor?.scope ? loadScope(viewerId, input.cursor.scope) : undefined,
  ]);
  // only a Mutual person with a kept WTT post is in the Mutual section; the rest are One way
  const keptWtt = await fetchFeedOwners(
    feedQueryOf({ viewerId, input, slugs, match }, "wtt"),
    ranked.map((person) => person.userId),
  );
  const mutual = ranked.filter((person) => keptWtt.has(person.userId));
  const seen = mergeSeen(snapshot, {
    mutual: mutual.map((person) => person.userId),
    oneWay: oneWay.map((person) => person.userId),
  });

  const ctx: PeopleContext = {
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
    lead,
    reads: readBudget(EXTRA_PEOPLE_READS),
    snapshot,
  };

  // a person the feed would not list, or that Mutual only does not, has no row to lead with
  const led =
    lead && !input.cursor && (mode !== "mutual" || mutual.some((person) => person.userId === lead))
      ? (await loadPeople(ctx, feedQueryOf(ctx, mode === "mutual" ? "wtt" : input.type), [lead]))[0]
      : undefined;

  const page = await fillPage(
    plan.phases,
    PEOPLE_PAGE_SIZE,
    (phase, need) => readPeoplePhase(ctx, phase, need),
    (loaded) => loaded.person.userId,
  );

  const people = [
    ...(led ? [{ ...led.person, section: undefined }] : []),
    ...page.posts.map(({ phase, person }) => ({
      ...person,
      section: sectioned
        ? phase === "mutual"
          ? ("mutual" as const)
          : ("oneWay" as const)
        : undefined,
    })),
  ];
  const drawn = unique(
    people.flatMap((person) =>
      person.posts.flatMap((post) => post.sides.flatMap((s) => s.items.map((i) => i.slug))),
    ),
  );
  const collectionRows = await fetchCollectionsBySlug(drawn, []);

  // Mutual only keeps a snapshot too, for its order across pages
  const byRank = plan.phases.includes("mutual") || plan.phases.includes("oneWay");
  let scope: string | undefined;
  if (byRank && page.next && viewerId !== null) {
    scope = scopeToken(seen);
    if (scope !== input.cursor?.scope) await saveScope(viewerId, scope, seen);
  }

  return {
    people,
    nextCursor: page.next && {
      ...page.next.last,
      ...(sectioned ? { phase: page.next.phase === "bump" ? undefined : page.next.phase } : {}),
      ...(scope ? { scope } : {}),
      lead,
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
  const [own, lastBump] = await Promise.all([fetchOwnTradeLists(userId), lastBumpOf(userId)]);
  const next = nextBumpAt(lastBump, now);
  // a list, as open tabs read it; every post carries the person's next bump
  return pairPosts(own)
    .toSorted(comparePosts)
    .map((post) => ({
      id: post.anchor.id,
      slug: post.anchor.slug,
      tag: post.tag,
      lists: [post.have, post.want, post.sale].flatMap((list) =>
        list ? [{ slug: list.slug, name: list.name, listTypeNew: list.listTypeNew }] : [],
      ),
      listed: !isPostIdle(post, now),
      bumpedAt: iso(post.bumpedAt),
      updatedAt: iso(post.updatedAt)!,
      nextBumpAt: next,
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
    const { items, more, copyCount } = previewSide(
      entriesOf.get(list.id) ?? [],
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
