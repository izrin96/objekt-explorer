import { indexer } from "@repo/db/indexer";
import { collections } from "@repo/db/indexer/schema";
import { and, inArray } from "drizzle-orm";

import { anyCopyScope, entryObjektId, inAnyCopyScope, itemFlags } from "../../../lib/offer-rules";
import { unique } from "../../../lib/unique";
import type { CollectionFilters } from "../../../schemas/common/filters";
import {
  CANDIDATE_PAGE_SIZE,
  type CandidateItem,
  type PickerNarrowing,
} from "../../../schemas/offer";
import {
  type Addressed,
  type IndexedObjekt,
  allowedEntries,
  copyKey,
  fetchCopies,
  fetchObjekts,
  linkedAddresses,
  openAnyCopyLegs,
  openOfferHolders,
  reservedIds,
} from "../core";
import { collectionWhere, collectionsOf, counteredGives, toCandidate, wantSlugsOf } from "./shared";

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
async function resolveTheirItems(me: string, addressed: Addressed) {
  const { partnerId } = addressed;
  const [entries, linked, kept] = await Promise.all([
    allowedEntries(addressed),
    linkedAddresses([partnerId]),
    counteredGives(addressed.conversationId, me),
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
      if (seen.has(objekt.id) || !theirs.has(objekt.owner)) continue;
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
  return { items, listed: entries.length > 0 || keptIds.length > 0 };
}

/**
 * Every item the sender may ask for, for the builder to check picks against and for suggestions;
 * `wanted` names those on the sender's want lists.
 */
export async function theirCandidates(me: string, addressed: Addressed, myWants?: string[]) {
  const [{ items, listed }, mineWanted] = await Promise.all([
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
  { filters, matchOnly }: PickerNarrowing,
) {
  const { items, listed } = await resolveTheirItems(me, addressed);
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
    wanted: [],
    collections: await collectionsOf(slice.map((item) => item.collectionSlug)),
  };
}
