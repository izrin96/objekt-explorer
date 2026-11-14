import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections } from "@repo/db/indexer/schema";
import { listEntries, lists } from "@repo/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { anyCopyItem, anyEntryOf } from "../../../lib/offer-any-item";
import { orderByCollection, pageByCollection } from "../../../lib/offer-paging";
import { anyCopyScope, entryObjektId, inAnyCopyScope, itemFlags } from "../../../lib/offer-rules";
import { copyKey } from "../../../lib/trade-rank";
import { unique } from "../../../lib/unique";
import type { CollectionFilters } from "../../../schemas/common/filters";
import {
  CANDIDATE_PAGE_SIZE,
  type CandidateCursor,
  type CandidateItem,
  type PartnerList,
  type PickerNarrowing,
} from "../../../schemas/offer";
import { anchoredSerialIds } from "../../objekt/serial-anchored";
import { pickerTagsFor } from "../../trade/feed/near";
import { askableOnTrade, postPartnerSql } from "../../trade/lists";
import {
  type Addressed,
  type IndexedObjekt,
  allowedEntries,
  collectionAddresses,
  fetchCopies,
  fetchObjekts,
  linkedAddresses,
  openAnyCopyLegs,
  openOfferHolders,
  partnerHasLists,
  refuseOffer,
  reservedIds,
} from "../core";
import {
  candidatesPage,
  collectionWhere,
  collectionsOf,
  counteredGives,
  ownedGroupPage,
  toCandidate,
  wantSlugsOf,
} from "./shared";

/** Of `slugs`, the collections `filters` keep. */
async function filterSlugs(slugs: string[], filters: Partial<CollectionFilters>) {
  if (slugs.length === 0) return new Set<string>();
  const rows = await indexer
    .select({ slug: collections.slug })
    .from(collections)
    .where(and(inArray(collections.slug, slugs), ...collectionWhere(filters)));
  return new Set(rows.map((row) => row.slug));
}

/** With Only what I want on, the collections on the sender's want lists; else null, keeping all. */
async function myWantsIf(me: string, matchOnly: boolean | undefined) {
  return matchOnly ? new Set(await wantSlugsOf(me, false)) : null;
}

/** The allowed list entries resolved against the partner's current wallet. */
export async function resolveTheirItems(me: string, addressed: Addressed, fromList?: string) {
  const { partnerId } = addressed;
  const [entries, linked, kept, hasLists] = await Promise.all([
    allowedEntries(addressed, undefined, fromList),
    linkedAddresses([partnerId]),
    fromList ? null : counteredGives(addressed.conversationId, me),
    partnerHasLists(partnerId),
  ]);
  const keptIds = [...(kept?.objekts.keys() ?? [])];
  const theirs = linked.get(partnerId) ?? new Set<string>();
  const addresses = [...theirs];
  // an any-copy ask fits every entry of its collection, so every listed collection can carry one
  const anySlugs = unique(entries.map((e) => e.collectionSlug));
  const entriesBySlug = Map.groupBy(entries, (e) => e.collectionSlug);
  const scope = anyCopyScope(entries);
  // a whole-collection entry on a list that shows serials offers every copy by serial, so its
  // any copy asks for one and more go by serial; a single listed objekt doesn't cover the rest
  const bySerial = new Set(
    entries.flatMap((e) => (entryObjektId(e) === null && !e.hideSerial ? [e.collectionSlug] : [])),
  );
  const listedAsAny = new Set(
    entries.flatMap((e) => (entryObjektId(e) === null ? [e.collectionSlug] : [])),
  );

  const [tokens, copies, promised] = await Promise.all([
    fetchObjekts([...entries.flatMap((e) => entryObjektId(e) ?? []), ...keptIds]),
    fetchCopies([...listedAsAny], addresses),
    openAnyCopyLegs([{ userId: partnerId, slugs: anySlugs }]),
  ]);
  const ids = unique([...tokens.keys(), ...copies.map((o) => o.id)]);
  const [reserved, holders, anchored] = await Promise.all([
    reservedIds(ids),
    openOfferHolders(ids, me),
    anchoredSerialIds(ids),
  ]);
  const flags = (objekt: IndexedObjekt) =>
    itemFlags(objekt, reserved, holders, addressed.conversationId);

  // a collection no entry lists as any copy is asked from the copies its entries name, which
  // are the tokens already read
  const named = [...tokens.values()].filter((o) => theirs.has(o.owner) && !listedAsAny.has(o.slug));
  const spareIds = new Map<string, string[]>();
  for (const o of [...copies, ...named]) {
    if (o.transferable && !reserved.has(o.id) && inAnyCopyScope(scope, o)) {
      spareIds.set(o.slug, [...(spareIds.get(o.slug) ?? []), o.id]);
    }
  }

  const items: CandidateItem[] = [];
  // where each collection's any item goes: before the items of its first entry
  const anyAt: { slug: string; at: number }[] = [];
  const seen = new Set<string>();
  const started = new Set<string>();
  for (const entry of entries) {
    const slug = entry.collectionSlug;
    if (!started.has(slug)) {
      started.add(slug);
      anyAt.push({ slug, at: items.length });
    }
    const objektId = entryObjektId(entry);
    if (objektId !== null) {
      const objekt = tokens.get(objektId);
      if (!objekt || !theirs.has(objekt.owner) || objekt.slug !== slug) continue;
      if (seen.has(objekt.id)) continue;
      seen.add(objekt.id);
      items.push(toCandidate(objekt, flags(objekt), anchored, entry.listSlug, entry.ratio));
      continue;
    }
    if (entry.hideSerial) continue;
    for (const objekt of copies) {
      if (objekt.slug !== slug || seen.has(objekt.id)) continue;
      seen.add(objekt.id);
      items.push(toCandidate(objekt, flags(objekt), anchored, entry.listSlug, entry.ratio));
    }
  }

  // what the countered offer gave, still with the partner
  for (const id of keptIds) {
    const objekt = tokens.get(id);
    if (!objekt || seen.has(id) || !theirs.has(objekt.owner)) continue;
    seen.add(id);
    items.push(toCandidate(objekt, flags(objekt), anchored, null));
  }

  const shownBySlug = Map.groupBy(
    items.filter((item) => item.objektId !== null),
    (item) => item.collectionSlug,
  );
  const placed: { at: number; item: CandidateItem }[] = [];
  for (const { slug, at } of anyAt) {
    const slugEntries = entriesBySlug.get(slug)!;
    const decided = anyCopyItem({
      entries: slugEntries,
      spareIds: spareIds.get(slug) ?? [],
      promised: promised.get(copyKey(partnerId, slug)) ?? 0,
      shown: (shownBySlug.get(slug) ?? []).map((item) => ({
        id: item.objektId!,
        transferable: item.transferable,
        reserved: item.reserved,
        inScope: inAnyCopyScope(scope, { id: item.objektId!, slug }),
      })),
    });
    if (!decided) continue;
    const ratio = anyEntryOf(slugEntries)!.ratio;
    placed.push({
      at,
      item: {
        collectionSlug: slug,
        objektId: null,
        serial: null,
        serialEstimated: false,
        transferable: true,
        reserved: false,
        inOpenOffer: [],
        listSlug: decided.listSlug,
        copies: decided.copies,
        bySerial: bySerial.has(slug),
        hidden: decided.hidden,
        ...(ratio !== null && { ratio }),
      },
    });
  }
  const ordered: CandidateItem[] = [];
  let next = 0;
  for (let i = 0; i <= items.length; i++) {
    while (next < placed.length && placed[next]!.at === i) ordered.push(placed[next++]!.item);
    if (i < items.length) ordered.push(items[i]!);
  }

  // whether the partner listed anything at all, so an empty picker can say why
  return {
    items: ordered,
    listed: entries.length > 0 || keptIds.length > 0,
    partnerLists: hasLists,
  };
}

/** The partner's lists on Trade, for the picker's List choice. */
export async function partnerListChoices(addressed: Addressed): Promise<PartnerList[]> {
  const wantHalf = alias(lists, "want_half");
  const rows = await db
    .select({ slug: lists.slug, name: lists.name, type: lists.listType, want: wantHalf.slug })
    .from(lists)
    .leftJoin(
      wantHalf,
      and(
        eq(wantHalf.id, postPartnerSql("lists")),
        eq(wantHalf.listType, "want"),
        eq(wantHalf.discoverable, true),
        // an empty want list takes anything, as `postWantedAmong` reads it
        sql`EXISTS (SELECT 1 FROM ${listEntries} WHERE ${listEntries.listId} = ${wantHalf.id})`,
      ),
    )
    .where(and(eq(lists.userId, addressed.partnerId), askableOnTrade))
    .orderBy(lists.id);
  return rows.flatMap((row) =>
    row.type === "have" || row.type === "sale" ? [{ ...row, type: row.type }] : [],
  );
}

/**
 * Every item the sender may ask for, for the builder to check picks against and for suggestions;
 * `wanted` names those on the sender's want lists.
 */
export async function theirCandidates(me: string, addressed: Addressed, myWants?: string[]) {
  const [{ items, listed, partnerLists }, mineWanted] = await Promise.all([
    resolveTheirItems(me, addressed),
    myWants ?? wantSlugsOf(me, false),
  ]);
  const want = new Set(mineWanted);
  return candidatesPage({
    items,
    listed,
    partnerLists,
    wanted: unique(
      items.flatMap((item) => (want.has(item.collectionSlug) ? [item.collectionSlug] : [])),
    ),
    collections: await collectionsOf(items.map((item) => item.collectionSlug)),
  });
}

/** The picker's view: resolved whole, narrowed, then one page from `offset`. */
export async function theirPickerPage(
  me: string,
  addressed: Addressed,
  offset: number,
  { filters, matchOnly, fromList }: PickerNarrowing,
) {
  const [{ items, listed, partnerLists }, wanted] = await Promise.all([
    resolveTheirItems(me, addressed, fromList),
    myWantsIf(me, matchOnly),
  ]);
  let shown = items;
  if (wanted) shown = shown.filter((item) => wanted.has(item.collectionSlug));
  if (filters && Object.values(filters).some((value) => value?.length)) {
    const kept = await filterSlugs(unique(shown.map((item) => item.collectionSlug)), filters);
    shown = shown.filter((item) => kept.has(item.collectionSlug));
  }
  const { page: slice, nextOffset } = pageByCollection(
    orderByCollection(shown),
    offset,
    CANDIDATE_PAGE_SIZE,
  );
  const [tags, collections] = await Promise.all([
    matchOnly
      ? pickerTagsFor(
          me,
          addressed.partnerId,
          "get",
          slice.map((item) => item.collectionSlug),
        )
      : undefined,
    collectionsOf(slice.map((item) => item.collectionSlug)),
  ]);
  return candidatesPage({
    items: slice,
    nextOffset,
    listed,
    partnerLists,
    tags,
    collections,
  });
}

/** What the countered offer gave, still with the partner, whatever address it sits at. */
async function keptObjekts(
  kept: Awaited<ReturnType<typeof counteredGives>>,
  addresses: string[],
  filters: PickerNarrowing["filters"],
  wanted: ReadonlySet<string> | null,
) {
  if (!kept) return [];
  const found = await fetchObjekts([...kept.objekts.keys()]);
  const held = new Set(addresses);
  const mine = [...found.values()].filter(
    (objekt) => held.has(objekt.owner) && (!wanted || wanted.has(objekt.slug)),
  );
  const slugs = filters ? await filterSlugs(unique(mine.map((o) => o.slug)), filters) : null;
  return mine.filter((objekt) => !slugs || slugs.has(objekt.slug));
}

/** Every copy the partner holds of `slugs`, the collections the countered offer gave, which lead the first page. */
async function keptCollections(slugs: string[], addresses: string[]) {
  const copies = await fetchCopies(slugs, addresses);
  return orderByCollection(
    copies.map((objekt) => ({
      objekt,
      collectionSlug: objekt.slug,
      objektId: objekt.id,
      serial: objekt.serial,
    })),
  ).map((row) => row.objekt);
}

/** Refused for a partner with lists, so this side cannot bypass them. */
export async function theirCollectionPage(
  me: string,
  addressed: Addressed,
  cursor: CandidateCursor | undefined,
  narrowing: PickerNarrowing,
) {
  const { partnerId } = addressed;
  // the other reads don't refuse, so `not_listed` is still the first refusal here
  const [hasLists, addresses, myWants, countered] = await Promise.all([
    partnerHasLists(partnerId),
    collectionAddresses(partnerId),
    myWantsIf(me, narrowing.matchOnly),
    counteredGives(addressed.conversationId, me),
  ]);
  if (hasLists) refuseOffer("not_listed");
  // the kept objekts' collections lead the first page whole, so every page leaves them out; the
  // page read waits only for their slugs, which no counter makes an immediate answer
  const keptSlugs = unique(
    (await keptObjekts(countered, addresses, narrowing.filters, myWants)).map((o) => o.slug),
  );
  const none = { page: [], nextCursor: null };
  const [{ page, nextCursor }, kept] = await Promise.all([
    addresses.length === 0 || myWants?.size === 0
      ? none
      : ownedGroupPage(addresses, cursor, {
          filters: narrowing.filters,
          slugs: myWants && [...myWants],
          exclude: keptSlugs,
        }),
    cursor || keptSlugs.length === 0 ? [] : keptCollections(keptSlugs, addresses),
  ]);
  const objekts = [...kept, ...page];
  const ids = objekts.map((o) => o.id);
  const [reserved, holders, anchored, collections] = await Promise.all([
    reservedIds(ids),
    openOfferHolders(ids, me),
    anchoredSerialIds(ids),
    collectionsOf(objekts.map((o) => o.slug)),
  ]);
  return candidatesPage({
    items: objekts.map((objekt) =>
      toCandidate(
        objekt,
        itemFlags(objekt, reserved, holders, addressed.conversationId),
        anchored,
        null,
      ),
    ),
    nextCursor,
    partnerLists: false,
    collections,
  });
}
