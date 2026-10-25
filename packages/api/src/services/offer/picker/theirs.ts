import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections } from "@repo/db/indexer/schema";
import { lists } from "@repo/db/schema";
import { and, eq, inArray } from "drizzle-orm";

import { anyCopyScope, entryObjektId, inAnyCopyScope, itemFlags } from "../../../lib/offer-rules";
import { unique } from "../../../lib/unique";
import type { CollectionFilters } from "../../../schemas/common/filters";
import {
  CANDIDATE_PAGE_SIZE,
  type CandidateCursor,
  type CandidateItem,
  type PartnerList,
  type PickerNarrowing,
} from "../../../schemas/offer";
import { offersOnTrade } from "../../trade-lists";
import {
  type Addressed,
  type IndexedObjekt,
  allowedEntries,
  collectionAddresses,
  copyKey,
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
  collectionWhere,
  collectionsOf,
  counteredGives,
  keptGives,
  ownedPage,
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

/** The allowed list entries resolved against the partner's current wallet. */
async function resolveTheirItems(me: string, addressed: Addressed, fromList?: string) {
  const { partnerId } = addressed;
  const [entries, linked, kept, hasLists] = await Promise.all([
    allowedEntries(addressed, undefined, fromList),
    linkedAddresses([partnerId]),
    fromList ? null : keptGives(addressed, me),
    partnerHasLists(partnerId),
  ]);
  const keptIds = [...(kept?.objekts.keys() ?? [])];
  const theirs = linked.get(partnerId) ?? new Set<string>();
  const addresses = [...theirs];
  const anySlugs = unique(
    entries.flatMap((e) => (entryObjektId(e) === null ? [e.collectionSlug] : [])),
  );
  const scope = anyCopyScope(entries);

  const [tokens, copies, promised] = await Promise.all([
    fetchObjekts([...entries.flatMap((e) => entryObjektId(e) ?? []), ...keptIds]),
    fetchCopies(anySlugs, addresses),
    openAnyCopyLegs([{ userId: partnerId, slugs: anySlugs }]),
  ]);
  const ids = unique([...tokens.keys(), ...copies.map((o) => o.id)]);
  const [reserved, holders] = await Promise.all([reservedIds(ids), openOfferHolders(ids)]);
  const flags = (objekt: IndexedObjekt) =>
    itemFlags(objekt, reserved, holders, addressed.conversationId);

  const items: CandidateItem[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    const objektId = entryObjektId(entry);
    if (objektId !== null) {
      const objekt = tokens.get(objektId);
      if (!objekt || !theirs.has(objekt.owner) || objekt.slug !== entry.collectionSlug) continue;
      if (seen.has(objekt.id)) continue;
      seen.add(objekt.id);
      items.push(toCandidate(objekt, flags(objekt), entry.listSlug));
      continue;
    }
    const held = copies.filter((o) => o.slug === entry.collectionSlug);
    const spare =
      held.filter((o) => o.transferable && !reserved.has(o.id) && inAnyCopyScope(scope, o)).length -
      (promised.get(copyKey(partnerId, entry.collectionSlug)) ?? 0);
    const anyKey = `any:${entry.collectionSlug}`;
    if (spare > 0 && !seen.has(anyKey)) {
      seen.add(anyKey);
      items.push({
        collectionSlug: entry.collectionSlug,
        objektId: null,
        serial: null,
        serialEstimated: false,
        transferable: true,
        reserved: false,
        inOpenOffer: [],
        listSlug: entry.listSlug,
        copies: spare,
      });
    }
    if (entry.hideSerial) continue;
    for (const objekt of held) {
      if (seen.has(objekt.id)) continue;
      seen.add(objekt.id);
      items.push(toCandidate(objekt, flags(objekt), entry.listSlug));
    }
  }

  // what the countered offer gave, still with the partner
  for (const id of keptIds) {
    const objekt = tokens.get(id);
    if (!objekt || seen.has(id) || !theirs.has(objekt.owner)) continue;
    seen.add(id);
    items.push(toCandidate(objekt, flags(objekt), null));
  }

  // whether the partner listed anything at all, so an empty picker can say why
  return { items, listed: entries.length > 0 || keptIds.length > 0, partnerLists: hasLists };
}

/** Empty for a scoped offer, which shows its one list only. */
export async function partnerListChoices(addressed: Addressed): Promise<PartnerList[]> {
  if (addressed.onlyList !== null) return [];
  const rows = await db
    .select({ slug: lists.slug, name: lists.name, type: lists.listType })
    .from(lists)
    .where(and(eq(lists.userId, addressed.partnerId), offersOnTrade))
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
  return {
    items,
    suggested: [],
    nextCursor: null,
    nextOffset: null,
    listed,
    partnerLists,
    scopedList: addressed.onlyList !== null,
    wanted: unique(
      items.flatMap((item) => (want.has(item.collectionSlug) ? [item.collectionSlug] : [])),
    ),
    collections: await collectionsOf(items.map((item) => item.collectionSlug)),
  };
}

/** The picker's view: resolved whole, narrowed, then one page from `offset`. */
export async function theirPickerPage(
  me: string,
  addressed: Addressed,
  offset: number,
  { filters, matchOnly, fromList }: PickerNarrowing,
) {
  const { items, listed, partnerLists } = await resolveTheirItems(me, addressed, fromList);
  let shown = items;
  if (matchOnly) {
    const wanted = new Set(await wantSlugsOf(me, false));
    shown = shown.filter((item) => wanted.has(item.collectionSlug));
  }
  if (filters && Object.values(filters).some((value) => value?.length)) {
    const kept = await filterSlugs(unique(shown.map((item) => item.collectionSlug)), filters);
    shown = shown.filter((item) => kept.has(item.collectionSlug));
  }
  const end = offset + CANDIDATE_PAGE_SIZE;
  const slice = shown.slice(offset, end);
  return {
    items: slice,
    suggested: [],
    nextCursor: null,
    nextOffset: end < shown.length ? end : null,
    listed,
    partnerLists,
    scopedList: addressed.onlyList !== null,
    wanted: [],
    collections: await collectionsOf(slice.map((item) => item.collectionSlug)),
  };
}

/** What the countered offer gave, still with the partner, whatever address it sits at. */
async function keptItems(
  me: string,
  addressed: Addressed,
  addresses: string[],
  { filters, matchOnly }: PickerNarrowing,
) {
  const kept = await counteredGives(addressed.conversationId, me);
  if (!kept) return [];
  const [found, wanted] = await Promise.all([
    fetchObjekts([...kept.objekts.keys()]),
    matchOnly ? wantSlugsOf(me, false) : null,
  ]);
  const held = new Set(addresses);
  const mine = [...found.values()].filter(
    (objekt) => held.has(objekt.owner) && (!wanted || wanted.includes(objekt.slug)),
  );
  const slugs = filters ? await filterSlugs(unique(mine.map((o) => o.slug)), filters) : null;
  return mine.filter((objekt) => !slugs || slugs.has(objekt.slug));
}

/** Refused for a partner with lists, so this side cannot bypass them. */
export async function theirCollectionPage(
  me: string,
  addressed: Addressed,
  cursor: CandidateCursor | undefined,
  narrowing: PickerNarrowing,
) {
  const { partnerId } = addressed;
  if (addressed.onlyList !== null || (await partnerHasLists(partnerId))) {
    refuseOffer("not_listed");
  }
  const [addresses, myWants] = await Promise.all([
    collectionAddresses(partnerId),
    narrowing.matchOnly ? wantSlugsOf(me, false) : null,
  ]);
  const none = { page: [], nextCursor: null };
  const [{ page, nextCursor }, kept] = await Promise.all([
    addresses.length === 0 || myWants?.length === 0
      ? none
      : ownedPage(addresses, cursor, { filters: narrowing.filters, slugs: myWants }),
    keptItems(me, addressed, addresses, narrowing),
  ]);
  // kept objekts lead the first page, so later pages leave them out
  const keptIds = new Set(kept.map((o) => o.id));
  const rest = page.filter((o) => !keptIds.has(o.id));
  const objekts = cursor ? rest : [...kept, ...rest];
  const ids = objekts.map((o) => o.id);
  const [reserved, holders] = await Promise.all([reservedIds(ids), openOfferHolders(ids)]);
  return {
    items: objekts.map((objekt) =>
      toCandidate(objekt, itemFlags(objekt, reserved, holders, addressed.conversationId), null),
    ),
    suggested: [],
    nextCursor,
    nextOffset: null,
    listed: true,
    partnerLists: false,
    wanted: [],
    collections: await collectionsOf(objekts.map((o) => o.slug)),
  };
}
