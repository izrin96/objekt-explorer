import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { listEntries, lists } from "@repo/db/schema";
import { and, desc, eq, inArray, lt, ne, or } from "drizzle-orm";

import { giveNarrowing, itemFlags } from "../../../lib/offer-rules";
import { unique } from "../../../lib/unique";
import { CANDIDATE_PAGE_SIZE, type PickerNarrowing } from "../../../schemas/offer";
import { offersOnTrade } from "../../trade-lists";
import {
  type Addressed,
  type IndexedObjekt,
  fetchCopies,
  fetchObjekts,
  linkedAddresses,
  lowerOwner,
  objektColumns,
  openOfferHolders,
  reservedIds,
} from "../core";
import { collectionWhere, collectionsOf, toCandidate, wantListOf, wantSlugsOf } from "./shared";

/** The sender's own objekts, newest received first; on the first page, their have-list objekts too. */
export async function mineCandidates(
  me: string,
  addressed: Addressed,
  cursor: { receivedAt: string; id: string } | undefined,
  { filters, matchOnly, wantList }: PickerNarrowing,
) {
  const empty = {
    items: [],
    suggested: [],
    nextCursor: null,
    nextOffset: null,
    listed: true,
    wanted: [],
    collections: {},
  };
  const [linked, partnerWants, named] = await Promise.all([
    linkedAddresses([me]),
    matchOnly ? wantSlugsOf(addressed.partnerId, true) : null,
    wantList === undefined ? null : wantListOf(wantList),
  ]);
  const keptSlugs = giveNarrowing(addressed.partnerId, partnerWants, named);
  const addresses = [...(linked.get(me) ?? [])];
  if (addresses.length === 0 || keptSlugs?.length === 0) return empty;

  const [rows, haveEntries] = await Promise.all([
    indexer
      .select(objektColumns)
      .from(objekts)
      .innerJoin(collections, eq(collections.id, objekts.collectionId))
      .where(
        and(
          inArray(objekts.owner, addresses),
          ne(collections.slug, "empty-collection"),
          ...collectionWhere(filters),
          keptSlugs ? inArray(collections.slug, keptSlugs) : undefined,
          cursor
            ? or(
                lt(objekts.receivedAt, cursor.receivedAt),
                and(eq(objekts.receivedAt, cursor.receivedAt), lt(objekts.id, cursor.id)),
              )
            : undefined,
        ),
      )
      .orderBy(desc(objekts.receivedAt), desc(objekts.id))
      .limit(CANDIDATE_PAGE_SIZE + 1),
    cursor
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

  const page = rows.slice(0, CANDIDATE_PAGE_SIZE).map(lowerOwner);
  const mine = new Set(addresses);
  const [haveTokens, haveCopies] = await Promise.all([
    fetchObjekts(haveEntries.flatMap((e) => (e.objektId ? [e.objektId] : []))),
    fetchCopies(
      haveEntries.flatMap((e) =>
        e.objektId === null && e.collectionSlug ? [e.collectionSlug] : [],
      ),
      addresses,
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
  const [reserved, holders] = await Promise.all([reservedIds(ids), openOfferHolders(ids)]);
  const flags = (objekt: IndexedObjekt) =>
    itemFlags(objekt, reserved, holders, addressed.conversationId);
  const suggestionOf = new Map(suggestedList.map((s) => [s.objekt.id, s.listSlug]));

  const last = page.at(-1);
  return {
    items: page.map((objekt) =>
      toCandidate(objekt, flags(objekt), suggestionOf.get(objekt.id) ?? null),
    ),
    suggested: suggestedList.map(({ objekt, listSlug }) =>
      toCandidate(objekt, flags(objekt), listSlug),
    ),
    nextCursor:
      rows.length > CANDIDATE_PAGE_SIZE && last
        ? { receivedAt: new Date(last.receivedAt).toISOString(), id: last.id }
        : null,
    nextOffset: null,
    listed: true,
    wanted: [],
    collections: await collectionsOf(
      [...page, ...suggestedList.map((s) => s.objekt)].map((o) => o.slug),
    ),
  };
}
