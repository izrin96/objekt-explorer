import { db } from "@repo/db";
import { collections, objekts } from "@repo/db/indexer/schema";
import { listEntries, lists } from "@repo/db/schema";
import { and, eq, inArray, or } from "drizzle-orm";

import { giveNarrowing, itemFlags } from "../../../lib/offer-rules";
import { unique } from "../../../lib/unique";
import {
  CANDIDATE_PAGE_SIZE,
  type CandidateCursor,
  type PickerNarrowing,
} from "../../../schemas/offer";
import { offersOnTrade } from "../../trade-lists";
import {
  type Addressed,
  type IndexedObjekt,
  fetchCopies,
  fetchObjekts,
  linkedAddresses,
  openOfferHolders,
  refuseOffer,
  reservedIds,
} from "../core";
import {
  candidatesPage,
  collectionWhere,
  collectionsOf,
  ownedPage,
  toCandidate,
  wantListOf,
  wantSlugsOf,
} from "./shared";

/** The condition keeping what one of the sender's own have, sale or general lists names; null when it names nothing. */
async function listWhere(me: string, slug: string) {
  const [list] = await db
    .select({ id: lists.id })
    .from(lists)
    .where(
      and(
        eq(lists.slug, slug),
        eq(lists.userId, me),
        inArray(lists.listType, ["have", "sale", "general"]),
      ),
    );
  if (!list) refuseOffer("not_allowed");
  const entries = await db
    .select({ objektId: listEntries.objektId, collectionSlug: listEntries.collectionSlug })
    .from(listEntries)
    .where(eq(listEntries.listId, list.id));
  const ids = entries.flatMap((e) => (e.objektId ? [e.objektId] : []));
  const slugs = entries.flatMap((e) =>
    e.objektId === null && e.collectionSlug ? [e.collectionSlug] : [],
  );
  return (
    or(
      ids.length > 0 ? inArray(objekts.id, ids) : undefined,
      slugs.length > 0 ? inArray(collections.slug, slugs) : undefined,
    ) ?? null
  );
}

/** The sender's own objekts, newest received first; on the first page, their have-list objekts too. */
export async function mineCandidates(
  me: string,
  addressed: Addressed,
  cursor: CandidateCursor | undefined,
  { filters, matchOnly, wantList, fromList }: PickerNarrowing,
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
    ownedPage(addresses, cursor, { filters, slugs: keptSlugs, where: fromWhere }),
    cursor || fromList !== undefined
      ? []
      : db
          .select({
            listSlug: lists.slug,
            collectionSlug: listEntries.collectionSlug,
            objektId: listEntries.objektId,
          })
          .from(listEntries)
          .innerJoin(lists, eq(lists.id, listEntries.listId))
          .where(and(eq(lists.userId, me), offersOnTrade))
          .orderBy(listEntries.id),
  ]);

  const mine = new Set(addresses);
  // the list-first section narrows by the picker's filters, as the page below does
  const narrow = and(...collectionWhere(filters));
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
  const kept = keptSlugs ? new Set(keptSlugs) : null;
  const suggestedList = [...suggestedObjekts.values()]
    .filter((s) => !kept || kept.has(s.objekt.slug))
    .slice(0, CANDIDATE_PAGE_SIZE);

  const ids = unique([...page.map((o) => o.id), ...suggestedList.map((s) => s.objekt.id)]);
  const [reserved, holders] = await Promise.all([reservedIds(ids), openOfferHolders(ids, me)]);
  const flags = (objekt: IndexedObjekt) =>
    itemFlags(objekt, reserved, holders, addressed.conversationId);
  const suggestionOf = new Map(suggestedList.map((s) => [s.objekt.id, s.listSlug]));

  return candidatesPage({
    items: page.map((objekt) =>
      toCandidate(objekt, flags(objekt), suggestionOf.get(objekt.id) ?? null),
    ),
    suggested: suggestedList.map(({ objekt, listSlug }) =>
      toCandidate(objekt, flags(objekt), listSlug),
    ),
    nextCursor,
    collections: await collectionsOf(
      [...page, ...suggestedList.map((s) => s.objekt)].map((o) => o.slug),
    ),
  });
}
