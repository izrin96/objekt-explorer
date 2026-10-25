import type { ValidObjekt } from "@repo/lib/types/objekt";

import { iso } from "../../lib/time";
import {
  buildPeopleOrder,
  EXTRA_PEOPLE_READS,
  matchIndexOf,
  ORDER_LIMIT,
  orderReader,
  ordersFingerprint,
  type PeopleOrder,
  readBatches,
  readBudget,
  resumeAt,
} from "../../lib/trade-feed";
import { type toPartnerIdentity } from "../../lib/trade-rank";
import { unique } from "../../lib/unique";
import { type BrowseMatchMode, PEOPLE_PAGE_SIZE, type PeopleInput } from "../../schemas/trade";
import { fetchCollectionsBySlug } from "../list";
import { getOneWayPeople } from "../trade-matches/one-way";
import type { PersonMatch } from "../trade-matches/person";
import { type LoadContext, loadPosts, mutualPeopleOf, resolveFeed } from "./index";
import { type FeedQuery, fetchBumpPeople, fetchFeedOwners, fetchPersonRows } from "./query";
import { loadPeopleOrder, orderToken, savePeopleOrder } from "./scope";

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

type PeopleContext = LoadContext & { input: PeopleInput };

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

/**
 * The whole order of people a feed opens with: Browse by newest bump, Mutual only best Mutual
 * first, Any its Mutual section, then One way, then everyone else by bump. `mutual` is who the
 * Mutual section holds.
 */
async function buildOrder(
  ctx: PeopleContext,
  mode: BrowseMatchMode,
  query: FeedQuery,
  lead: string | undefined,
): Promise<{ order: PeopleOrder; mutual: Set<string> }> {
  const { match, input } = ctx;
  // Mutual lists WTT posts only, so WTB and WTS skip it
  const withMutual =
    mode === "mutual" || (mode === "any" && (input.type === "all" || input.type === "wtt"));
  const [ranked, oneWay] = await Promise.all([
    match && withMutual ? mutualPeopleOf(match) : [],
    match && mode === "any" ? getOneWayPeople(match.userId, match.sides) : [],
  ]);
  // only a Mutual person with a kept WTT post is in the Mutual section; the rest are One way
  const [keptWtt, keptOneWay] = await Promise.all([
    fetchFeedOwners(
      feedQueryOf(ctx, "wtt"),
      ranked.map((person) => person.userId),
    ),
    fetchFeedOwners(
      query,
      oneWay.map((person) => person.userId),
    ),
  ]);
  const mutual = ranked.filter((person) => keptWtt.has(person.userId));
  const sections = [
    {
      section: "mutual" as const,
      people: mutual.map((person) => ({ id: person.userId })),
    },
    {
      section: "oneWay" as const,
      people: oneWay
        .filter((person) => keptOneWay.has(person.userId))
        .map((person) => ({ id: person.userId })),
    },
  ];
  const mutualIds = new Set(mutual.map((person) => person.userId));
  const head = buildPeopleOrder(sections, lead);
  if (mode === "mutual") return { order: { people: head.people }, mutual: mutualIds };

  const room = ORDER_LIMIT - head.people.length;
  const tail = await fetchBumpPeople(query, {
    limit: room + 1,
    excludeOwners: [...head.people.map((entry) => entry.id), ...(lead ? [lead] : [])],
  });
  const atOf = new Map(tail.map((row) => [row.user_id, iso(row.cursor_at)!]));
  const built = buildPeopleOrder(
    [...sections, { people: tail.map((row) => ({ id: row.user_id })) }],
    lead,
  );
  const last = built.people.at(-1);
  const after =
    last && !last.section ? { bumpedAt: atOf.get(last.id)!, userId: last.id } : undefined;
  return {
    order: { people: built.people, ...(built.capped ? { more: { after } } : {}) },
    mutual: mutualIds,
  };
}

/** The order a page reads, where it starts, and (when built by this request) who Mutual holds. */
type OpenedOrder = {
  order: PeopleOrder;
  token: string;
  start: number;
  built?: { mutual: Set<string> };
};

/**
 * The cursor's stored order when it is still there and was built for these filters; otherwise
 * a new one, which a cursor joins by `resumeAt`.
 */
async function openOrder(
  ctx: PeopleContext,
  mode: BrowseMatchMode,
  query: FeedQuery,
  lead: string | undefined,
  filters: string,
): Promise<OpenedOrder> {
  const { viewerId, input } = ctx;
  const { cursor } = input;
  if (cursor) {
    const stored = await loadPeopleOrder(viewerId, cursor.order, filters);
    if (stored) return { order: stored, token: cursor.order, start: cursor.at };
  }
  const { order, mutual } = await buildOrder(ctx, mode, query, lead);
  return {
    order,
    token: orderToken(filters, order),
    start: cursor ? resumeAt(order.people, cursor) : 0,
    built: { mutual },
  };
}

/**
 * Trade as people: 12 a page, each with every post the feed keeps for them (up to
 * `PERSON_POST_LIMIT`). Page 1 works out the whole order and stores it; later pages go on by
 * position in it, so a ranking or a bump that changes mid-scroll moves no one. An order that is
 * gone, or was built for other filters, is built again and the page goes on from the cursor's
 * person. `person` leads the first page with that person's row.
 */
export async function peopleFeed(viewerId: string | null, input: PeopleInput) {
  const empty = { people: [], nextCursor: undefined, collections: {} };
  const resolved = await resolveFeed(viewerId, input);
  if (!resolved) return empty;
  const { viewer, slugs, match } = resolved;
  const mode = match ? resolved.mode : "off";
  const { cursor } = input;

  const lead = cursor ? cursor.lead : input.person;
  const ctx: PeopleContext = { viewerId, viewer, input, slugs, match };
  // Mutual is a swap between two people, so under Mutual only it lists WTT posts
  const query = feedQueryOf(ctx, mode === "mutual" ? "wtt" : input.type);
  const filters = ordersFingerprint({
    facets: {
      artist: input.artist,
      member: input.member,
      season: input.season,
      class: input.class,
      on_offline: input.on_offline,
      collection: input.collection,
    },
    type: input.type,
    slug: input.slug ?? null,
    mode,
    listId: match?.sides.listId ?? null,
    lead: lead ?? null,
  });

  const opened = await openOrder(ctx, mode, query, lead, filters);
  const { order, token, built } = opened;

  // a person the feed would not list, or that Mutual only does not, has no row to lead with
  const led =
    lead && !cursor && built && (mode !== "mutual" || built.mutual.has(lead))
      ? (await loadPeople(ctx, query, [lead]))[0]
      : undefined;

  const ranked = order.people.flatMap((entry) => (entry.section ? [entry.id] : []));
  const reader = orderReader(
    order,
    opened.start,
    cursor && { bumpedAt: cursor.bumpedAt, userId: cursor.userId },
    async (after, limit) => {
      const found = await fetchBumpPeople(query, {
        limit,
        cursor: after,
        excludeOwners: lead ? [...ranked, lead] : ranked,
      });
      return found.map((row) => ({ bumpedAt: iso(row.cursor_at)!, userId: row.user_id }));
    },
  );
  const read = await readBatches({
    need: PEOPLE_PAGE_SIZE,
    budget: readBudget(EXTRA_PEOPLE_READS),
    fetch: reader.fetch,
    load: (rows) =>
      loadPeople(
        ctx,
        query,
        rows.map((row) => row.id),
      ),
  });
  const sectionOf = new Map(order.people.map((entry) => [entry.id, entry.section]));

  const people = [
    ...(led ? [{ ...led.person, section: undefined }] : []),
    ...read.taken.map(({ person }) => ({
      ...person,
      // under Any everyone past the Mutual section reads as One way, the tail too
      section:
        mode === "any"
          ? sectionOf.get(person.userId) === "mutual"
            ? ("mutual" as const)
            : ("oneWay" as const)
          : undefined,
    })),
  ];
  const drawn = unique(
    people.flatMap((person) =>
      person.posts.flatMap((post) =>
        post.sides
          .flatMap((s) => [
            ...s.items.map((i) => i.slug),
            ...s.rules.flatMap((r) => r.matchedSlugs),
          ])
          .concat(post.ruleMatches.map((found) => found.slug)),
      ),
    ),
  );
  const collectionRows = await fetchCollectionsBySlug(drawn, []);

  const last = read.dry ? undefined : read.examined;
  const lastTaken = read.taken.at(-1);
  if (last && built) await savePeopleOrder(viewerId, token, filters, order);

  return {
    people,
    // `bumpedAt` and `userId` let a cursor go on past a capped order or into a rebuilt one
    nextCursor: last && {
      bumpedAt:
        last.bumpedAt ??
        (lastTaken ? iso(lastTaken.newest)! : (cursor?.bumpedAt ?? new Date(0).toISOString())),
      userId: last.id,
      lead,
      order: token,
      at: reader.position(),
    },
    collections: Object.fromEntries(collectionRows.map((c) => [c.slug, c])) as Record<
      string,
      ValidObjekt
    >,
  };
}
