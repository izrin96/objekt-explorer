import { db } from "@repo/db";
import { listEntries, lists, offer, offerItem, userSanction } from "@repo/db/schema";
import { and, eq, gt, inArray, ne, sql } from "drizzle-orm";

import { firstListed } from "../../lib/chat-rules";
import {
  anyAsksFit,
  askCandidates,
  closedCollectionAsks,
  onePostVerdict,
  unwantedGives,
} from "../../lib/offer-recipient-rules";
import {
  type ActorLimits,
  anyCopyScope,
  createEffect,
  effectiveStatus,
  entriesFitting,
  matchEntry,
  openOffersOf,
  validateShape,
} from "../../lib/offer-rules";
import { scanMessage } from "../../lib/scam-patterns";
import { unique } from "../../lib/unique";
import { publishNotify } from "../../realtime";
import { type FlagCategory } from "../../schemas/chat";
import { type CreateOfferInput, type OfferRefusal, OPEN_OFFER_LIMIT } from "../../schemas/offer";
import {
  appendMessage,
  chatSafety,
  checkMessageRate,
  checkStart,
  ensureConversation,
  hydrateCards,
  lockStarts,
  openFirst,
  prepareFirst,
  publishChatChanged,
} from "../chat";
import { getUsdRates } from "../market/currency-rates";
import { activeSanctionWhere } from "../moderation/safety";
import { refusedCollectionAsks } from "./collection";
import {
  linkedAddresses,
  lockParties,
  openOfferHolders,
  refuseOffer,
  refuseUnsafe,
  refuseUnsafeIn,
  resolveAddressed,
  allowedEntries,
  collectionAddresses,
  offerRulesOf,
  partnerHasLists,
  resolvePostList,
} from "./core";
import { type ItemRow, checkItems } from "./items";
import { partyNames, writeNotes } from "./notes";
import { counteredAsks, counteredGives, postWantedAmong, wantedAmong } from "./picker/shared";
import {
  type OfferRow,
  findOffer,
  lockConversation,
  offerRowColumns,
  publishTouched,
  refuseAction,
} from "./state";
import { fetchOffers, offerItemCards, toOfferView } from "./view";

/**
 * Why a counter of `counteredId` can't be sent: it lapsed, another offer to `me` replaced it, or
 * it was answered or withdrawn. `replaced` says whether another offer to `me` is open now.
 */
async function staleCounterReason(
  executor: Pick<typeof db, "select">,
  counteredId: number,
  conversationId: number | null,
  me: string,
  replaced: boolean,
): Promise<OfferRefusal> {
  const [countered] = await executor
    .select(offerRowColumns)
    .from(offer)
    .where(eq(offer.id, counteredId));
  if (!countered || countered.conversationId !== conversationId || countered.toUserId !== me) {
    return "not_open";
  }
  if (effectiveStatus(countered, new Date()) === "expired") return "expired";
  return replaced ? "offer_changed" : "not_open";
}

/** Whether any of `slugs` is on one of the partner's want lists. */
async function givesWanted(partnerId: string, slugs: string[]) {
  if (slugs.length === 0) return false;
  const [row] = await db
    .select({ id: listEntries.id })
    .from(listEntries)
    .innerJoin(lists, eq(lists.id, listEntries.listId))
    .where(
      and(
        eq(lists.userId, partnerId),
        eq(lists.listType, "want"),
        inArray(listEntries.collectionSlug, [...new Set(slugs)]),
      ),
    )
    .limit(1);
  return row !== undefined;
}

export async function createOffer(
  me: string,
  meCreatedAt: Date,
  input: CreateOfferInput,
): Promise<{
  offerId: number;
  conversationId: number;
  created: boolean;
  warnings: { objektId: string; offerIds: number[] }[];
}> {
  const now = new Date();
  const rates = await getUsdRates();
  const shape = validateShape(input, new Set(Object.keys(rates)));
  if (!shape.ok) refuseOffer(shape.reason);

  const addressed = await resolveAddressed(me, meCreatedAt, input);
  const { partnerId } = addressed;
  const startCtx = addressed.start;
  // the offer is the conversation's first message when it is empty, and then the start
  const firstRead =
    startCtx === null && addressed.empty ? prepareFirst(me, meCreatedAt, partnerId) : null;
  // none of these reads refuses, so the refusals below keep their order
  const [firstCtx, safety, addresses, entries, kept, hasLists, rules, postListId] =
    await Promise.all([
      startCtx ?? firstRead,
      startCtx?.safety ?? firstRead?.then((ctx) => ctx.safety) ?? chatSafety(me, partnerId),
      linkedAddresses([me, partnerId]),
      allowedEntries(
        addressed,
        input.get.map((item) => item.collectionSlug),
      ),
      counteredGives(addressed.conversationId, me),
      partnerHasLists(partnerId),
      offerRulesOf(partnerId),
      resolvePostList(partnerId, input.post),
    ]);
  const myAddresses = addresses.get(me)!;
  if (myAddresses.size === 0) refuseOffer("no_address");
  refuseUnsafe("send", safety);
  // before the get side is checked: a stale counter's kept items would read as unlisted
  if (input.counters !== undefined && kept?.offerId !== input.counters) {
    refuseOffer(
      await staleCounterReason(db, input.counters, addressed.conversationId, me, kept !== null),
    );
  }
  // a listed objekt the partner offered still counts as kept, so key it by id, not by a list
  const keptObjekt = (item: { objektId?: string; collectionSlug: string }) =>
    item.objektId !== undefined && kept?.objekts.get(item.objektId) === item.collectionSlug;
  const getRows = input.get.map((item) => {
    const entry = matchEntry(item, entries);
    if (entry) {
      // a token reached only through a collection entry: the picker names it only where serials show
      const byCollection = item.objektId !== undefined && entry.objektId === null;
      return { item, listId: entry.listId, kept: false, byCollection };
    }
    const keeps = keptObjekt(item);
    if (!keeps && hasLists) {
      refuseOffer("not_listed", item.objektId ? { objektIds: [item.objektId] } : {});
    }
    return { item, listId: null, kept: keeps, byCollection: false };
  });
  // every recipient rule refuses before `checkMessageRate`, which spends a send slot
  const closed = closedCollectionAsks(
    getRows.map((row) => ({ item: row.item, kept: row.kept })),
    { hasLists, allowCollectionAsks: rules.allowCollectionAsks },
  );
  if (closed.length > 0) {
    refuseOffer("not_listed", {
      objektIds: closed.flatMap((item) => (item.objektId ? [item.objektId] : [])),
      collectionSlugs: closed.flatMap((item) =>
        item.objektId === undefined ? [item.collectionSlug] : [],
      ),
    });
  }
  // one post per offer, for a recipient with a list on Trade and Let people ask from more than
  // one post off (web-trade-offers); with it on, an offer across posts is on no one post
  let onPost = postListId;
  // the list every ask comes through, once one post per offer has chosen it
  let chosen: number | null = null;
  if (hasLists) {
    const listIdOf = new Map(entries.map((entry) => [entry.listSlug, entry.listId]));
    const asks = getRows.map((row) => {
      const preferred =
        row.item.listSlug === undefined ? undefined : listIdOf.get(row.item.listSlug);
      const fitting = unique(entriesFitting(row.item, entries).map((entry) => entry.listId));
      return {
        item: row,
        kept: keptObjekt(row.item),
        candidates: askCandidates(row.item, fitting, preferred),
        preferred,
      };
    });
    let verdict = onePostVerdict(asks, postListId);
    if (!verdict.ok && rules.multiPostAsks && postListId !== null) {
      // asks across posts are allowed, so a named post they don't fit only loses its say
      onPost = null;
      verdict = onePostVerdict(asks, null);
    }
    if (!verdict.ok && rules.multiPostAsks) {
      onPost = null;
    } else if (!verdict.ok) {
      refuseOffer("other_post", {
        objektIds: verdict.refused.flatMap((row) => (row.item.objektId ? [row.item.objektId] : [])),
        collectionSlugs: verdict.refused.flatMap((row) =>
          row.item.objektId === undefined ? [row.item.collectionSlug] : [],
        ),
      });
    }
    chosen = verdict.ok ? verdict.listId : null;
    if (
      chosen !== null &&
      rules.multiPostAsks &&
      !anyAsksFit(
        getRows.map((row) => row.item),
        entries.filter((entry) => entry.listId === chosen),
      )
    ) {
      // the any asks need copies from more than this list, which this recipient allows
      chosen = null;
      onPost = null;
    }
    const onChosen = entries.filter((entry) => entry.listId === chosen);
    for (const row of getRows) {
      // a kept objekt stays on its own list: the recipient offered it, wherever it sits
      if (chosen !== null && row.listId !== null && !keptObjekt(row.item)) {
        row.listId = chosen;
        // reached the way the chosen post offers it, not the first list that fits
        row.byCollection =
          row.item.objektId !== undefined && matchEntry(row.item, onChosen)?.objektId === null;
      }
    }
    onPost ??= chosen;
  }
  if (rules.onlyWantedOffers) {
    const slugs = input.give.map((item) => item.collectionSlug);
    // on a post, its own want list; a post without one takes anything; no post, every want list
    const [wanted, asked] = await Promise.all([
      onPost !== null ? postWantedAmong(onPost, slugs) : wantedAmong(partnerId, slugs),
      counteredAsks(addressed.conversationId, me),
    ]);
    const unwanted = unwantedGives(input.give, wanted, asked);
    if (unwanted.length > 0) {
      refuseOffer("not_wanted", { objektIds: unwanted.map((item) => item.objektId) });
    }
  }
  const collectionAddrs = hasLists ? null : await collectionAddresses(partnerId);
  const byCollection = getRows.filter((row) => row.byCollection).map((row) => row.item);
  if (byCollection.length > 0) {
    const refused = await refusedCollectionAsks(
      byCollection,
      collectionAddrs ?? (await collectionAddresses(partnerId)),
    );
    if (refused.length > 0) {
      refuseOffer("not_listed", { objektIds: refused.map((item) => item.objektId!) });
    }
  }
  if (collectionAddrs) {
    const refused = await refusedCollectionAsks(
      getRows.filter((row) => !row.kept).map((row) => row.item),
      collectionAddrs,
    );
    if (refused.length > 0) {
      refuseOffer("not_listed", {
        objektIds: refused.flatMap((item) => (item.objektId ? [item.objektId] : [])),
        collectionSlugs: refused.flatMap((item) =>
          item.objektId === undefined ? [item.collectionSlug] : [],
        ),
      });
    }
  }
  const keptIds = new Set(getRows.flatMap((row) => (row.kept ? [row.item.objektId!] : [])));
  const asksThroughList = getRows.some((row) => row.listId !== null);
  const items: ItemRow[] = [
    ...input.give.map((item) => ({
      side: "give" as const,
      collectionSlug: item.collectionSlug,
      objektId: item.objektId,
    })),
    ...input.get.map((item) => ({
      side: "get" as const,
      collectionSlug: item.collectionSlug,
      objektId: item.objektId ?? null,
    })),
  ];
  const partnerAddresses = addresses.get(partnerId)!;
  const specificIds = items.flatMap((item) => (item.objektId ? [item.objektId] : []));
  // only checkItems refuses in this batch, so its refusals still come before the send slot
  const [, wantedGive, holders, name] = await Promise.all([
    checkItems(items, {
      giverId: (side) => (side === "give" ? me : partnerId),
      // a kept objekt was the partner's own offer, so it may sit anywhere they hold it
      holders: (side) => {
        if (side === "give") return myAddresses;
        return collectionAddrs && keptIds.size === 0 ? new Set(collectionAddrs) : partnerAddresses;
      },
      copyHolders: (side) => (side === "give" ? myAddresses : partnerAddresses),
      // an any-copy ask takes only a copy the chosen post offers
      getScope: collectionAddrs
        ? undefined
        : anyCopyScope(chosen === null ? entries : entries.filter((e) => e.listId === chosen)),
    }),
    firstCtx !== null &&
      !asksThroughList &&
      givesWanted(
        partnerId,
        input.give.map((item) => item.collectionSlug),
      ),
    openOfferHolders(specificIds, me),
    partyNames([me, partnerId]),
  ]);
  const listed =
    firstCtx !== null &&
    firstListed({ offer: { asksThroughList, givesWanted: wantedGive } }, partnerId);
  const warnings = specificIds.flatMap((objektId) => {
    const offerIds = openOffersOf(holders.get(objektId) ?? [], addressed.conversationId);
    return offerIds.length > 0 ? [{ objektId, offerIds }] : [];
  });

  const releaseSlot = await checkMessageRate(me, now);
  const note = input.note ? input.note : null;
  const caution: FlagCategory[] = note === null ? [] : scanMessage(note);

  const result = await db
    .transaction(async (tx) => {
      await lockParties(tx, [me, partnerId]);
      await refuseUnsafeIn(tx, "send", me, partnerId);
      let conversationId: number;
      let created = false;
      if (startCtx) {
        const existingId = await checkStart(tx, startCtx);
        ({ id: conversationId, created } = await ensureConversation(tx, startCtx, existingId));
      } else {
        conversationId = addressed.conversationId!;
        // the start lock comes before the row lock, as everywhere else
        if (firstCtx) await lockStarts(tx, me);
      }
      await lockConversation(tx, conversationId);
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('offer_open'), hashtext(${me}))`);

      const [current] = await tx
        .select(offerRowColumns)
        .from(offer)
        .where(and(eq(offer.conversationId, conversationId), eq(offer.status, "open")))
        // a block or another trade's accept cancels offers without this conversation's lock;
        // the row lock waits for it and re-reads the status, so a counter never overwrites it
        .for("update");
      let open: OfferRow | null = current ?? null;
      const expiredNotes: Parameters<typeof writeNotes>[1] = [];
      if (open && effectiveStatus(open, now) === "expired") {
        await tx
          .update(offer)
          .set({ status: "expired", respondedAt: sql`now()` })
          .where(eq(offer.id, open.id));
        const { id, fromUserId, toUserId } = open;
        for (const [userId, other] of [
          [fromUserId, toUserId],
          [toUserId, fromUserId],
        ] as const) {
          expiredNotes.push({
            type: "offer",
            userId,
            payload: {
              offerId: id,
              conversationId,
              tradeId: null,
              event: "expired",
              reason: null,
              partner: name(other),
            },
          });
        }
        open = null;
      }
      const effect = createEffect(open, me);
      // a counter answers the offer its sender saw, never one that replaced it since
      if (input.counters !== undefined && (effect !== "counter" || open!.id !== input.counters)) {
        refuseOffer(
          await staleCounterReason(tx, input.counters, conversationId, me, effect === "counter"),
        );
      }
      // kept objekts ride on countering that very offer; anything else lists them again
      if (keptIds.size > 0 && (effect !== "counter" || open?.id !== kept?.offerId)) {
        refuseOffer("not_listed", { objektIds: [...keptIds] });
      }

      const openSent = await tx.$count(
        offer,
        and(
          eq(offer.fromUserId, me),
          eq(offer.status, "open"),
          gt(offer.expiresAt, sql`now()`),
          effect === "replace" ? ne(offer.id, open!.id) : undefined,
        ),
      );
      if (openSent >= OPEN_OFFER_LIMIT) refuseOffer("too_many_open");

      if (open && effect !== "new") {
        await tx
          .update(offer)
          .set({
            status: effect === "counter" ? "countered" : "withdrawn",
            respondedAt: sql`now()`,
          })
          .where(eq(offer.id, open.id));
      }

      const [inserted] = await tx
        .insert(offer)
        .values({
          conversationId,
          fromUserId: me,
          toUserId: partnerId,
          parentId: effect === "counter" ? open!.id : null,
          topupAmount: shape.topup?.amount ?? null,
          topupCurrency: shape.topup?.currency ?? null,
          topupPayer: shape.topup?.payer ?? null,
          note,
          caution: caution.length ? caution : null,
          // an offer that asks for nothing is on no post, though its post chose the wants above
          postListId: getRows.some((row) => !keptObjekt(row.item)) ? onPost : null,
        })
        .returning({ id: offer.id });
      const offerId = inserted!.id;

      await tx.insert(offerItem).values([
        ...input.give.map((item) => ({
          offerId,
          side: "give" as const,
          collectionSlug: item.collectionSlug,
          objektId: item.objektId,
        })),
        ...getRows.map(({ item, listId }) => ({
          offerId,
          side: "get" as const,
          collectionSlug: item.collectionSlug,
          objektId: item.objektId ?? null,
          listId,
        })),
      ]);
      await appendMessage(tx, conversationId, me, {
        caution,
        offerId,
        first: firstCtx ? () => openFirst(tx, firstCtx, conversationId) : undefined,
        listed,
      });

      const notified = await writeNotes(tx, [
        ...expiredNotes,
        {
          type: "offer",
          userId: partnerId,
          payload: {
            offerId,
            conversationId,
            tradeId: null,
            event: effect === "counter" ? "countered" : "received",
            reason: null,
            partner: name(me),
          },
        },
      ]);
      return { offerId, conversationId, created, notified };
    })
    // a refusal inside the transaction sends nothing, so it gives the slot back
    .catch(async (error: unknown) => {
      await releaseSlot();
      throw error;
    });

  await publishChatChanged([me, partnerId], result.conversationId);
  await Promise.all(result.notified.map((userId) => publishNotify(userId)));
  return {
    offerId: result.offerId,
    conversationId: result.conversationId,
    created: result.created,
    warnings,
  };
}

/** Decline (the recipient) or withdraw (the sender); `respondedAt` marks when. */
export async function respondToOffer(me: string, offerId: number, action: "decline" | "withdraw") {
  const now = new Date();
  const [row, name] = await Promise.all([findOffer(offerId, me), partyNames([me])]);
  const partnerId = row.fromUserId === me ? row.toUserId : row.fromUserId;
  // a trade block refuses only accept and counter (actionRefusal), so decline and withdraw read no safety
  refuseAction(row, me, action, now);

  const notified = await db.transaction(async (tx) => {
    await lockConversation(tx, row.conversationId);
    const updated = await tx
      .update(offer)
      .set({
        status: action === "decline" ? "declined" : "withdrawn",
        respondedAt: sql`now()`,
      })
      .where(and(eq(offer.id, offerId), eq(offer.status, "open"), gt(offer.expiresAt, sql`now()`)))
      .returning({ id: offer.id });
    if (updated.length === 0) {
      const [fresh] = await tx.select(offerRowColumns).from(offer).where(eq(offer.id, offerId));
      refuseAction(fresh!, me, action, new Date());
      refuseOffer("not_open");
    }
    return writeNotes(tx, [
      {
        type: "offer",
        userId: partnerId,
        payload: {
          offerId,
          conversationId: row.conversationId,
          tradeId: null,
          event: action === "decline" ? "declined" : "withdrawn",
          reason: null,
          partner: name(me),
        },
      },
    ]);
  });

  await publishTouched(
    [{ conversationId: row.conversationId, userIds: [me, partnerId] }],
    notified,
  );
}

async function actorLimits(me: string): Promise<ActorLimits> {
  const rows = await db
    .select({ type: userSanction.type })
    .from(userSanction)
    .where(
      and(
        eq(userSanction.userId, me),
        inArray(userSanction.type, ["chat_mute", "trade_block", "ban"]),
        activeSanctionWhere,
      ),
    );
  return {
    muted: rows.some((row) => row.type === "chat_mute"),
    tradeBlocked: rows.some((row) => row.type === "trade_block" || row.type === "ban"),
  };
}

/**
 * Live offer cards for a thread, without refetching its messages: the offers among `ids`
 * the viewer is a party to, others dropped silently. Hydrated as the thread hydrates them.
 */
export async function offerViews(me: string, ids: number[]) {
  const [found, limits] = await Promise.all([fetchOffers(ids, me), actorLimits(me)]);
  const mine = [...found.values()].filter(
    (row) => row.from_user_id === me || row.to_user_id === me,
  );
  const { serial, collections } = await hydrateCards(offerItemCards(mine), me);
  const now = new Date();
  return {
    offers: mine.map((row) => toOfferView(row, me, now, limits, serial)),
    collections,
  };
}
