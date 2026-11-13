import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { listEntries, lists } from "@repo/db/schema";
import { and, asc, eq, inArray, or } from "drizzle-orm";

import { orderByCollection, pageByCollection } from "../../../lib/offer-paging";
import { giveNarrowing, itemFlags } from "../../../lib/offer-rules";
import { unique } from "../../../lib/unique";
import {
  CANDIDATE_PAGE_SIZE,
  type CandidateCursor,
  type PickerNarrowing,
} from "../../../schemas/offer";
import { anchoredSerialIds } from "../../objekt/serial-anchored";
import { pickerTagsFor } from "../../trade/feed/near";
import { boundOfferList } from "../../trade/lists";
import {
  type Addressed,
  type IndexedObjekt,
  fetchCopies,
  fetchObjekts,
  linkedAddresses,
  lowerOwner,
  openOfferHolders,
  refuseOffer,
  reservedIds,
} from "../core";
import {
  candidatesPage,
  collectionWhere,
  collectionsOf,
  ownedGroupPage,
  ownedPage,
  ownedQuery,
  toCandidate,
  wantListOf,
  wantSlugsOf,
} from "./shared";

/**
 * The condition, on objekt columns only, keeping what one of the sender's own have, sale or
 * general lists names; null when it names nothing.
 */
async function listWhere(me: string, slug: string) {
  // a list with no entries is one row of nulls, so no row at all is no such list
  const entries = await db
    .select({ objektId: listEntries.objektId, collectionSlug: listEntries.collectionSlug })
    .from(lists)
    .leftJoin(listEntries, eq(listEntries.listId, lists.id))
    .where(
      and(
        eq(lists.slug, slug),
        eq(lists.userId, me),
        inArray(lists.listType, ["have", "sale", "general"]),
      ),
    );
  if (entries.length === 0) refuseOffer("not_allowed");
  const ids = entries.flatMap((e) => (e.objektId ? [e.objektId] : []));
  const slugs = entries.flatMap((e) =>
    e.objektId === null && e.collectionSlug ? [e.collectionSlug] : [],
  );
  return (
    or(
      ids.length > 0 ? inArray(objekts.id, ids) : undefined,
      slugs.length > 0
        ? inArray(
            objekts.collectionId,
            indexer
              .select({ id: collections.id })
              .from(collections)
              .where(inArray(collections.slug, slugs)),
          )
        : undefined,
    ) ?? null
  );
}

// `mineCandidates` names its collection map `collections`, which hides the table there
const slugIn = (slugs: string[]) => inArray(collections.slug, slugs);

/**
 * Every copy of the collections `slugs` the addresses hold, unpaged: bounded by holdings. Lowest
 * serial first, as a picker page orders a collection, since an any-copy ask takes the first free.
 */
async function copiesRead(addresses: string[], narrowing: Parameters<typeof ownedQuery>[1]) {
  const rows = await ownedQuery(addresses, narrowing).orderBy(asc(objekts.serial), asc(objekts.id));
  return { page: rows.map(lowerOwner), nextCursor: null };
}

/** The sender's own objekts, newest received first; on the first page, their have-list objekts too. */
export async function mineCandidates(
  me: string,
  addressed: Addressed,
  cursor: CandidateCursor | undefined,
  { filters, matchOnly, wantList, fromList, objektIds, copiesOf }: PickerNarrowing,
) {
  const [linked, partnerWants, named, fromWhere] = await Promise.all([
    linkedAddresses([me]),
    matchOnly ? wantSlugsOf(addressed.partnerId, true) : null,
    wantList === undefined ? null : wantListOf(wantList),
    fromList === undefined ? undefined : listWhere(me, fromList),
  ]);
  const keptSlugs = giveNarrowing(addressed.partnerId, partnerWants, named);
  const addresses = [...(linked.get(me) ?? [])];
  if (addresses.length === 0 || keptSlugs?.length === 0 || fromWhere === null)
    return candidatesPage({});

  const [{ page, nextCursor }, haveEntries] = await Promise.all([
    copiesOf
      ? copiesRead(addresses, { filters, slugs: copiesOf, where: fromWhere })
      : // an objektIds read is flags for a few copies, not a grid, so it stays a flat page
        (objektIds ? ownedPage : ownedGroupPage)(addresses, cursor, {
          filters,
          slugs: keptSlugs,
          where: and(fromWhere, objektIds ? inArray(objekts.id, objektIds) : undefined),
        }),
    cursor || fromList !== undefined || objektIds !== undefined
      ? []
      : db
          .select({
            listSlug: lists.slug,
            collectionSlug: listEntries.collectionSlug,
            objektId: listEntries.objektId,
          })
          .from(listEntries)
          .innerJoin(lists, eq(lists.id, listEntries.listId))
          .where(and(eq(lists.userId, me), boundOfferList))
          .orderBy(listEntries.id),
  ]);

  const mine = new Set(addresses);
  // the list-first section narrows by the picker's filters, as the page below does
  const narrow = and(...collectionWhere(filters), copiesOf ? slugIn(copiesOf) : undefined);
  const [haveTokens, haveCopies] = await Promise.all([
    fetchObjekts(
      haveEntries.flatMap((e) => (e.objektId ? [e.objektId] : [])),
      narrow,
    ),
    fetchCopies(
      haveEntries.flatMap((e) =>
        e.objektId === null && e.collectionSlug ? [e.collectionSlug] : [],
      ),
      addresses,
      narrow,
    ),
  ]);

  const suggestedObjekts = new Map<string, { objekt: IndexedObjekt; listSlug: string }>();
  for (const entry of haveEntries) {
    const owned = entry.objektId
      ? [haveTokens.get(entry.objektId)].filter((o) => o !== undefined && mine.has(o.owner))
      : haveCopies.filter((o) => o.slug === entry.collectionSlug);
    for (const objekt of owned) {
      if (!suggestedObjekts.has(objekt!.id)) {
        suggestedObjekts.set(objekt!.id, { objekt: objekt!, listSlug: entry.listSlug });
      }
    }
  }
  const keptNow = copiesOf ?? keptSlugs;
  const kept = keptNow ? new Set(keptNow) : null;
  const ordered = orderByCollection(
    [...suggestedObjekts.values()]
      .filter((s) => !kept || kept.has(s.objekt.slug))
      .map((s) => ({
        suggestion: s,
        collectionSlug: s.objekt.slug,
        objektId: s.objekt.id,
        serial: s.objekt.serial,
      })),
  );
  // a copies read serves every ask at once, so no collection's have-list copies may be cut
  const suggestedList = (
    copiesOf ? ordered : pageByCollection(ordered, 0, CANDIDATE_PAGE_SIZE).page
  ).map((row) => row.suggestion);

  const ids = unique([...page.map((o) => o.id), ...suggestedList.map((s) => s.objekt.id)]);
  const [reserved, holders, anchored, tags, collections] = await Promise.all([
    reservedIds(ids),
    openOfferHolders(ids, me),
    anchoredSerialIds(ids),
    matchOnly
      ? pickerTagsFor(me, addressed.partnerId, "give", [
          ...page.map((o) => o.slug),
          ...suggestedList.map((s) => s.objekt.slug),
        ])
      : undefined,
    collectionsOf([...page, ...suggestedList.map((s) => s.objekt)].map((o) => o.slug)),
  ]);
  const flags = (objekt: IndexedObjekt) =>
    itemFlags(objekt, reserved, holders, addressed.conversationId);
  const suggestionOf = new Map(suggestedList.map((s) => [s.objekt.id, s.listSlug]));

  return candidatesPage({
    items: page.map((objekt) =>
      toCandidate(objekt, flags(objekt), anchored, suggestionOf.get(objekt.id) ?? null),
    ),
    suggested: suggestedList.map(({ objekt, listSlug }) =>
      toCandidate(objekt, flags(objekt), anchored, listSlug),
    ),
    nextCursor,
    tags,
    collections,
  });
}
