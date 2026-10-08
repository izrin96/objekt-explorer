import { db } from "@repo/db";
import { conversation, listEntries, lists } from "@repo/db/schema";
import { and, eq, inArray } from "drizzle-orm";

import { pairKey } from "../../../lib/chat-rules";
import { itemFlags } from "../../../lib/offer-rules";
import { unique } from "../../../lib/unique";
import { type ChatTarget } from "../../../schemas/chat";
import { type CandidateItem, OFFER_SIDE_LIMIT, type PickerNarrowing } from "../../../schemas/offer";
import { chatSafety, fetchPref } from "../../chat";
import { resolveTradeSides } from "../../trade-matches";
import {
  type Addressed,
  type IndexedObjekt,
  fetchCopies,
  fetchObjekts,
  linkedAddresses,
  openOfferHolders,
  refuseOffer,
  reservedIds,
  resolveAddressed,
} from "../core";
import { mineCandidates } from "./mine";
import { collectionsOf, toCandidate } from "./shared";
import { theirCandidates, theirPickerPage } from "./theirs";

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
