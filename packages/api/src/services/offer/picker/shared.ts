import { toIndexedArtist } from "@repo/cosmo/types/common";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { listEntries, lists, offer, offerItem } from "@repo/db/schema";
import { isSerialEstimated, shownSerial } from "@repo/lib/serial";
import { type SQL, and, asc, desc, eq, gt, inArray, lt, notInArray, or, sql } from "drizzle-orm";

import { NOTHING_ASKED } from "../../../lib/offer-recipient-rules";
import type { itemFlags } from "../../../lib/offer-rules";
import { unique } from "../../../lib/unique";
import { type CollectionFilters } from "../../../schemas/common/filters";
import {
  CANDIDATE_PAGE_SIZE,
  type CandidateCursor,
  type CandidateItem,
  type PartnerList,
} from "../../../schemas/offer";
import type { PickerTag } from "../../../schemas/trade";
import { fetchCollectionsBySlug } from "../../list/collections";
import { type IndexedObjekt, lowerOwner, objektColumns } from "../core";

export function toCandidate(
  objekt: IndexedObjekt,
  flags: ReturnType<typeof itemFlags>,
  anchored: ReadonlySet<string>,
  listSlug: string | null,
  ratio: number | null = null,
): CandidateItem {
  return {
    collectionSlug: objekt.slug,
    objektId: objekt.id,
    serial: shownSerial(objekt.serial),
    serialEstimated: isSerialEstimated(objekt.mintedAt, anchored.has(objekt.id)),
    ...flags,
    listSlug,
    copies: null,
    bySerial: false,
    ...(ratio !== null && { ratio }),
  };
}

export async function collectionsOf(slugs: string[]) {
  const rows = await fetchCollectionsBySlug(unique(slugs), []);
  return Object.fromEntries(rows.map((row) => [row.slug, row]));
}

export type CandidatesPage = {
  items: CandidateItem[];
  suggested: CandidateItem[];
  nextCursor: CandidateCursor | null;
  nextOffset: number | null;
  listed: boolean;
  /** theirs: false when the partner has no list to ask through; read as true when absent */
  partnerLists?: boolean;
  /** theirs, whole list only: the List choice's lists */
  lists?: PartnerList[];
  /** the partner's offer rules as they apply now, for the builder to follow */
  partnerRules?: PartnerRules;
  wanted: string[];
  /** with Only what they want on: each near or loose copy's tag, by collection */
  tags?: Record<string, PickerTag>;
  collections: Awaited<ReturnType<typeof collectionsOf>>;
};

export type PartnerRules = {
  /** Only offers with what I want: gives come from the post's want list, a post without one takes anything */
  wantedOnly: boolean;
  /** a want list on Trade with entries, which an offer on no post gives from under `wantedOnly` */
  wantsOnTrade: boolean;
  /** asks come from one post: a have or sale list on Trade, and Let people ask from more than one post off */
  onePost: boolean;
  /** no have or sale list on Trade, and Let people ask for anything I hold off */
  asksClosed: boolean;
};

/** A candidates page, the fields a side leaves out at their empty values. */
export const candidatesPage = (page: Partial<CandidatesPage>): CandidatesPage => ({
  items: [],
  suggested: [],
  nextCursor: null,
  nextOffset: null,
  listed: true,
  wanted: [],
  collections: {},
  ...page,
});

export function collectionWhere(filters: Partial<CollectionFilters> | undefined) {
  if (!filters) return [];
  return [
    filters.artist?.length
      ? inArray(collections.artist, filters.artist.map(toIndexedArtist))
      : undefined,
    filters.member?.length ? inArray(collections.member, filters.member) : undefined,
    filters.season?.length ? inArray(collections.season, filters.season) : undefined,
    filters.class?.length ? inArray(collections.class, filters.class) : undefined,
    filters.on_offline?.length ? inArray(collections.onOffline, filters.on_offline) : undefined,
    filters.collection?.length ? inArray(collections.collectionNo, filters.collection) : undefined,
  ];
}

/**
 * The specific objekts the open offer sent to `me` in this conversation gives. A counter may
 * keep them on its get side: the partner put them up, so they need no list.
 */
export async function counteredGives(conversationId: number | null, me: string) {
  if (conversationId === null) return null;
  const rows = await db
    .select({ offerId: offer.id, objektId: offerItem.objektId, slug: offerItem.collectionSlug })
    .from(offer)
    .innerJoin(offerItem, and(eq(offerItem.offerId, offer.id), eq(offerItem.side, "give")))
    .where(
      and(
        eq(offer.conversationId, conversationId),
        eq(offer.status, "open"),
        eq(offer.toUserId, me),
        gt(offer.expiresAt, sql`now()`),
      ),
    );
  if (rows.length === 0) return null;
  return {
    offerId: rows[0]!.offerId,
    objekts: new Map(rows.flatMap((row) => (row.objektId ? [[row.objektId, row.slug]] : []))),
  };
}

/**
 * What the open offer sent to `me` in this conversation asks of `me`, by objekt and by any
 * copy: a counter may still give them under Only offers with what I want, since the partner
 * asked for them.
 */
export async function counteredAsks(conversationId: number | null, me: string) {
  if (conversationId === null) return NOTHING_ASKED;
  const rows = await db
    .select({ objektId: offerItem.objektId, slug: offerItem.collectionSlug })
    .from(offer)
    .innerJoin(offerItem, and(eq(offerItem.offerId, offer.id), eq(offerItem.side, "get")))
    .where(
      and(
        eq(offer.conversationId, conversationId),
        eq(offer.status, "open"),
        eq(offer.toUserId, me),
        gt(offer.expiresAt, sql`now()`),
      ),
    );
  return {
    objektIds: new Set(rows.flatMap((row) => (row.objektId ? [row.objektId] : []))),
    anyCopySlugs: new Set(rows.flatMap((row) => (row.objektId ? [] : [row.slug]))),
  };
}

/**
 * Which of `slugs` the user's want lists on Trade hold, or null when they have no want list on
 * Trade, which Only offers with what I want reads as "filter nothing".
 */
export async function wantedAmong(userId: string, slugs: string[]) {
  return wantedOn(
    and(eq(lists.userId, userId), eq(lists.listType, "want"), eq(lists.discoverable, true)),
    slugs,
  );
}

/**
 * Of `slugs`, those on the want list paired with the post `postListId`, or null when that post
 * has no want list on Trade (or an empty one), which takes anything.
 */
export async function postWantedAmong(postListId: number, slugs: string[]) {
  const [post] = await db
    .select({ want: lists.linkedListId })
    .from(lists)
    .where(eq(lists.id, postListId));
  if (post?.want == null) return null;
  return wantedOn(
    and(eq(lists.id, post.want), eq(lists.listType, "want"), eq(lists.discoverable, true)),
    slugs,
  );
}

/** Of `slugs`, those on the want lists `where` names; null when none of them holds an entry. */
async function wantedOn(where: SQL | undefined, slugs: string[]) {
  const [any] = await db
    .select({ id: listEntries.id })
    .from(listEntries)
    .innerJoin(lists, eq(lists.id, listEntries.listId))
    .where(where)
    .limit(1);
  if (!any) return null;
  if (slugs.length === 0) return new Set<string>();
  const rows = await db
    .selectDistinct({ slug: listEntries.collectionSlug })
    .from(listEntries)
    .innerJoin(lists, eq(lists.id, listEntries.listId))
    .where(and(where, inArray(listEntries.collectionSlug, unique(slugs))));
  return new Set(rows.flatMap((row) => (row.slug ? [row.slug] : [])));
}

/** Collections on the user's want lists; `discoverableOnly` for someone else's. */
export async function wantSlugsOf(userId: string, discoverableOnly: boolean) {
  const rows = await db
    .selectDistinct({ slug: listEntries.collectionSlug })
    .from(listEntries)
    .innerJoin(lists, eq(lists.id, listEntries.listId))
    .where(
      and(
        eq(lists.userId, userId),
        eq(lists.listType, "want"),
        discoverableOnly ? eq(lists.discoverable, true) : undefined,
      ),
    );
  return rows.flatMap((row) => (row.slug ? [row.slug] : []));
}

export async function wantListOf(slug: string) {
  // one row per entry, or one with a null slug for an empty list
  const rows = await db
    .select({
      list: {
        id: lists.id,
        userId: lists.userId,
        listType: lists.listType,
        discoverable: lists.discoverable,
      },
      slug: listEntries.collectionSlug,
    })
    .from(lists)
    .leftJoin(listEntries, eq(listEntries.listId, lists.id))
    .where(eq(lists.slug, slug));
  return {
    list: rows[0]?.list ?? null,
    slugs: rows.flatMap((row) => (row.slug ? [row.slug] : [])),
  };
}

type OwnedNarrowing = {
  filters?: Partial<CollectionFilters>;
  slugs?: readonly string[] | null;
  where?: SQL;
};

/** What the addresses hold, narrowed; the callers add ordering and limits. */
export function ownedQuery(
  addresses: string[],
  { filters, slugs, where }: OwnedNarrowing,
  extra?: SQL,
) {
  return indexer
    .select(objektColumns)
    .from(objekts)
    .innerJoin(collections, eq(collections.id, objekts.collectionId))
    .where(
      and(
        inArray(objekts.owner, addresses),
        ...collectionWhere(filters),
        slugs ? inArray(collections.slug, [...slugs]) : undefined,
        where,
        extra,
      ),
    );
}

/** The addresses' objekts, newest received first, one page after `cursor`. */
export async function ownedPage(
  addresses: string[],
  cursor: CandidateCursor | undefined,
  narrowing: OwnedNarrowing,
) {
  const rows = await ownedQuery(
    addresses,
    narrowing,
    cursor
      ? or(
          lt(objekts.receivedAt, cursor.receivedAt),
          and(eq(objekts.receivedAt, cursor.receivedAt), lt(objekts.id, cursor.id)),
        )
      : undefined,
  )
    .orderBy(desc(objekts.receivedAt), desc(objekts.id))
    .limit(CANDIDATE_PAGE_SIZE + 1);
  const page = rows.slice(0, CANDIDATE_PAGE_SIZE).map(lowerOwner);
  const last = page.at(-1);
  return {
    page,
    nextCursor:
      rows.length > CANDIDATE_PAGE_SIZE && last
        ? { receivedAt: new Date(last.receivedAt).toISOString(), id: last.id }
        : null,
  };
}

/**
 * The addresses' objekts as whole collections, newest-received collection first, one page after
 * `cursor`: collections are added while they fit `CANDIDATE_PAGE_SIZE`, and one over it is a page
 * of its own. The cursor is the last collection's newest `receivedAt` and its slug.
 * `where` narrows objekt columns, so the aggregate counts exactly the rows the page returns; the
 * filters, `slugs` and `exclude` narrow collections, before the window sum, so a page never comes
 * back short of what it counted.
 */
export async function ownedGroupPage(
  addresses: string[],
  cursor: CandidateCursor | undefined,
  { filters, slugs, where, exclude }: OwnedNarrowing & { exclude?: readonly string[] },
) {
  const mine = and(inArray(objekts.owner, addresses), where);
  // aggregated over `objekt` alone: joining `collection` first makes the planner scan it
  const g = indexer.$with("g").as(
    indexer
      .select({
        collectionId: objekts.collectionId,
        received: sql<string>`max(${objekts.receivedAt})`.as("received"),
        n: sql<number>`count(*)::int`.as("n"),
      })
      .from(objekts)
      .where(mine)
      .groupBy(objekts.collectionId),
  );
  // the slug is text, as the cursor holds it: `collection.id` is a uuid, which an old cursor's
  // objekt id would fail to cast
  const w = indexer.$with("w").as(
    indexer
      .select({
        collectionId: g.collectionId,
        slug: collections.slug,
        received: g.received,
        n: g.n,
        before:
          sql<number>`coalesce(sum(${g.n}) over (order by ${g.received} desc, ${collections.slug} desc rows between unbounded preceding and 1 preceding), 0)::int`.as(
            "before",
          ),
      })
      .from(g)
      .innerJoin(collections, eq(collections.id, g.collectionId))
      .where(
        and(
          ...collectionWhere(filters),
          slugs ? inArray(collections.slug, [...slugs]) : undefined,
          exclude?.length ? notInArray(collections.slug, [...exclude]) : undefined,
          cursor
            ? sql`(${g.received}, ${collections.slug}) < (${cursor.receivedAt}::timestamptz, ${cursor.id}::text)`
            : undefined,
        ),
      ),
  );
  const p = indexer.$with("p").as(
    indexer
      .select()
      .from(w)
      .where(sql`${w.before} = 0 or ${w.before} + ${w.n} <= ${CANDIDATE_PAGE_SIZE}`),
  );
  const rows = await indexer
    .with(g, w, p)
    .select({
      id: objekts.id,
      owner: objekts.owner,
      transferable: objekts.transferable,
      serial: objekts.serial,
      mintedAt: objekts.mintedAt,
      slug: p.slug,
      receivedAt: objekts.receivedAt,
      groupReceivedAt: sql<string>`${p.received}::text`,
      more: sql<boolean>`exists (select 1 from ${w} where ${w.before} > 0 and ${w.before} + ${w.n} > ${CANDIDATE_PAGE_SIZE})`,
    })
    .from(p)
    .innerJoin(objekts, and(eq(objekts.collectionId, p.collectionId), mine))
    .orderBy(desc(p.received), desc(p.slug), asc(objekts.serial), asc(objekts.id));
  const last = rows.at(-1);
  return {
    page: rows.map(({ groupReceivedAt: _, more: __, ...row }) => lowerOwner(row)),
    nextCursor: last?.more ? { receivedAt: last.groupReceivedAt, id: last.slug } : null,
  };
}
