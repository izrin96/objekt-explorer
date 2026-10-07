import { toIndexedArtist } from "@repo/cosmo/types/common";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { conversation, listEntries, lists, offer, offerItem } from "@repo/db/schema";
import { and, desc, eq, gt, inArray, lt, ne, or, sql } from "drizzle-orm";

import { pairKey } from "../lib/chat-rules";
import { giveNarrowing, itemFlags } from "../lib/offer-rules";
import { type ChatTarget } from "../schemas/chat";
import { type CollectionFilters } from "../schemas/common/filters";
import {
  CANDIDATE_PAGE_SIZE,
  type CandidateItem,
  OFFER_SIDE_LIMIT,
  type PickerNarrowing,
} from "../schemas/offer";
import { chatSafety, fetchPref } from "./chat";
import { fetchCollectionsBySlug } from "./list";
import {
  unique,
  refuseOffer,
  linkedAddresses,
  type IndexedObjekt,
  objektColumns,
  lowerOwner,
  fetchObjekts,
  fetchCopies,
  reservedIds,
  openAnyCopyLegs,
  copyKey,
  openOfferHolders,
  type Addressed,
  resolveAddressed,
  type AllowedEntry,
  allowedEntries,
} from "./offer-core";
import { offersOnTrade } from "./trade-lists";
import { resolveTradeSides } from "./trade-matches";

type GetItem = { collectionSlug: string; objektId?: string; listSlug?: string };

/** The entry a get item comes from: its own token, else a collection entry; the named list first. */
export function matchEntry(item: GetItem, entries: AllowedEntry[]) {
  const fits = (entry: AllowedEntry) =>
    entry.collectionSlug === item.collectionSlug &&
    (entry.objektId === null || (item.objektId !== undefined && entry.objektId === item.objektId));
  const candidates = entries.filter(fits);
  return candidates.find((entry) => entry.listSlug === item.listSlug) ?? candidates[0] ?? null;
}

function toCandidate(
  objekt: IndexedObjekt,
  flags: ReturnType<typeof itemFlags>,
  listSlug: string | null,
): CandidateItem {
  return {
    collectionSlug: objekt.slug,
    objektId: objekt.id,
    serial: objekt.serial,
    ...flags,
    listSlug,
    copies: null,
  };
}

async function collectionsOf(slugs: string[]) {
  const rows = await fetchCollectionsBySlug(unique(slugs), []);
  return Object.fromEntries(rows.map((row) => [row.slug, row]));
}

function collectionWhere(filters: Partial<CollectionFilters> | undefined) {
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

/** The sender's own objekts, newest received first; on the first page, their have-list objekts too. */
async function mineCandidates(
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

/** Collections on the user's want lists; `discoverableOnly` for someone else's. */
async function wantSlugsOf(userId: string, discoverableOnly: boolean) {
  const rows = await db
    .selectDistinct({ slug: listEntries.collectionSlug })
    .from(listEntries)
    .innerJoin(lists, eq(lists.id, listEntries.listId))
    .where(
      and(
        eq(lists.userId, userId),
        eq(lists.listTypeNew, "want"),
        discoverableOnly ? eq(lists.discoverable, true) : undefined,
      ),
    );
  return rows.flatMap((row) => (row.slug ? [row.slug] : []));
}

async function wantListOf(slug: string) {
  const [list] = await db
    .select({
      id: lists.id,
      userId: lists.userId,
      listTypeNew: lists.listTypeNew,
      discoverable: lists.discoverable,
    })
    .from(lists)
    .where(eq(lists.slug, slug));
  if (!list) return { list: null, slugs: [] };
  const rows = await db
    .select({ slug: listEntries.collectionSlug })
    .from(listEntries)
    .where(eq(listEntries.listId, list.id));
  return { list, slugs: rows.flatMap((row) => (row.slug ? [row.slug] : [])) };
}

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
  const anySlugs = unique(entries.flatMap((e) => (e.objektId === null ? [e.collectionSlug] : [])));

  const [tokens, copies, promised] = await Promise.all([
    fetchObjekts([...entries.flatMap((e) => (e.objektId ? [e.objektId] : [])), ...keptIds]),
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
    if (entry.objektId !== null) {
      const objekt = tokens.get(entry.objektId);
      if (!objekt || !theirs.has(objekt.owner) || objekt.slug !== entry.collectionSlug) continue;
      if (seen.has(objekt.id)) continue;
      seen.add(objekt.id);
      items.push(toCandidate(objekt, flags(objekt), entry.listSlug));
      continue;
    }
    const held = copies.filter((o) => o.slug === entry.collectionSlug);
    const spare =
      held.filter((o) => o.transferable && !reserved.has(o.id)).length -
      (promised.get(copyKey(partnerId, entry.collectionSlug)) ?? 0);
    const anyKey = `any:${entry.collectionSlug}`;
    if (spare > 0 && !seen.has(anyKey)) {
      seen.add(anyKey);
      items.push({
        collectionSlug: entry.collectionSlug,
        objektId: null,
        serial: null,
        transferable: true,
        reserved: false,
        inOpenOffer: [],
        listSlug: entry.listSlug,
        copies: spare,
      });
    }
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
async function theirCandidates(me: string, addressed: Addressed, myWants?: string[]) {
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
async function theirPickerPage(
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

export async function offerCandidates(
  me: string,
  meCreatedAt: Date,
  input: {
    conversationId?: number;
    target?: ChatTarget;
    side: "mine" | "theirs";
    cursor?: { receivedAt: string; id: string };
    offset?: number;
  } & PickerNarrowing,
) {
  const addressed = await resolveAddressed(me, meCreatedAt, input);
  // however the partner was named: the start verdict lets an existing conversation through
  // whatever the blocks
  if (input.side === "theirs") {
    const safety = addressed.start?.safety ?? (await chatSafety(me, addressed.partnerId));
    if (safety.blocked || safety.partnerTradeBlocked) refuseOffer("not_accepting");
  }
  if (input.side === "mine") return mineCandidates(me, addressed, input.cursor, input);
  // without an offset the whole list comes back, as the builder checks picks against it
  return input.offset === undefined
    ? theirCandidates(me, addressed)
    : theirPickerPage(me, addressed, input.offset, input);
}

export async function suggestOffer(me: string, partnerId: string) {
  if (partnerId === me) refuseOffer("self");
  const empty = { give: [] as CandidateItem[], get: [] as CandidateItem[], collections: {} };
  const safety = await chatSafety(me, partnerId);
  if (safety.blocked || safety.tradeBlocked || safety.partnerTradeBlocked) return empty;

  const sides = await resolveTradeSides(me, undefined);
  const { userLow, userHigh } = pairKey(me, partnerId);
  const [myEntries, partnerWants, existing] = await Promise.all([
    db
      .select({
        listId: listEntries.listId,
        listSlug: lists.slug,
        collectionSlug: listEntries.collectionSlug,
        objektId: listEntries.objektId,
      })
      .from(listEntries)
      .innerJoin(lists, eq(lists.id, listEntries.listId))
      .where(inArray(listEntries.listId, [...sides.haveListIds, ...sides.wantListIds]))
      .orderBy(listEntries.id),
    db
      .selectDistinct({ collectionSlug: listEntries.collectionSlug })
      .from(listEntries)
      .innerJoin(lists, eq(lists.id, listEntries.listId))
      .where(
        and(
          eq(lists.userId, partnerId),
          eq(lists.listTypeNew, "want"),
          eq(lists.discoverable, true),
        ),
      ),
    db
      .select({ id: conversation.id })
      .from(conversation)
      .where(and(eq(conversation.userLow, userLow), eq(conversation.userHigh, userHigh))),
  ]);
  const haveIds = new Set(sides.haveListIds);
  const myWantSlugs = unique(
    myEntries.flatMap((e) =>
      !haveIds.has(e.listId) && e.collectionSlug ? [e.collectionSlug] : [],
    ),
  );
  const theyWant = new Set(
    partnerWants.flatMap((w) => (w.collectionSlug ? [w.collectionSlug] : [])),
  );
  // with no conversation yet, someone who accepts no messages is not read at all
  if (!existing[0] && (await fetchPref(partnerId)).allow === "nobody") return empty;
  const addressed: Addressed = {
    partnerId,
    conversationId: existing[0]?.id ?? null,
    start: null,
  };

  const [theirs, mine] = await Promise.all([
    myWantSlugs.length === 0 ? null : theirCandidates(me, addressed, myWantSlugs),
    (async () => {
      const giveEntries = myEntries.filter(
        (e) => haveIds.has(e.listId) && e.collectionSlug && theyWant.has(e.collectionSlug),
      );
      const addresses = [...((await linkedAddresses([me])).get(me) ?? [])];
      const [tokens, copies] = await Promise.all([
        fetchObjekts(giveEntries.flatMap((e) => (e.objektId ? [e.objektId] : []))),
        fetchCopies(
          giveEntries.flatMap((e) => (e.objektId === null ? [e.collectionSlug!] : [])),
          addresses,
        ),
      ]);
      const ids = [...tokens.keys(), ...copies.map((c) => c.id)];
      const [reserved, holders] = await Promise.all([reservedIds(ids), openOfferHolders(ids)]);
      const owned = new Set(addresses);
      const picked = new Map<string, CandidateItem>();
      const offerable = (o: IndexedObjekt) =>
        owned.has(o.owner) && o.transferable && !reserved.has(o.id) && !picked.has(o.id);
      for (const entry of giveEntries) {
        const choice = entry.objektId
          ? [tokens.get(entry.objektId)].find(
              (o) => o && o.slug === entry.collectionSlug && offerable(o),
            )
          : copies.find((o) => o.slug === entry.collectionSlug && offerable(o));
        if (!choice) continue;
        picked.set(
          choice.id,
          toCandidate(
            choice,
            itemFlags(choice, reserved, holders, addressed.conversationId),
            entry.listSlug,
          ),
        );
      }
      return [...picked.values()];
    })(),
  ]);

  const wanted = new Set(myWantSlugs);
  const get = (theirs?.items ?? []).filter(
    (item) => wanted.has(item.collectionSlug) && item.transferable && !item.reserved,
  );
  // one item per wanted collection: any copy where offered, else the first specific one
  const bySlug = new Map<string, CandidateItem>();
  for (const item of get) {
    const current = bySlug.get(item.collectionSlug);
    if (!current || (item.objektId === null && current.objektId !== null)) {
      bySlug.set(item.collectionSlug, item);
    }
  }
  const give = mine.slice(0, OFFER_SIDE_LIMIT);
  const getItems = [...bySlug.values()].slice(0, OFFER_SIDE_LIMIT);
  return {
    give,
    get: getItems,
    collections: await collectionsOf([...give, ...getItems].map((item) => item.collectionSlug)),
  };
}

/** The viewer's own sanctions that change which actions an offer card offers. */
