import { db } from "@repo/db";
import { offer, offerItem, userSanction } from "@repo/db/schema";
import { and, eq, gt, inArray, ne, sql } from "drizzle-orm";

import {
  type ActorLimits,
  anyCopyScope,
  createEffect,
  effectiveStatus,
  matchEntry,
  validateShape,
} from "../../lib/offer-rules";
import { scanMessage } from "../../lib/scam-patterns";
import { publishNotify } from "../../realtime";
import { type FlagCategory } from "../../schemas/chat";
import { type CreateOfferInput, OPEN_OFFER_LIMIT } from "../../schemas/offer";
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
import { getUsdRates } from "../currency-rates";
import { activeSanctionWhere } from "../safety";
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
  partnerHasLists,
} from "./core";
import { type ItemRow, checkItems } from "./items";
import { partyNames, writeNotes } from "./notes";
import { keptGives } from "./picker/shared";
import {
  type OfferRow,
  findOffer,
  lockConversation,
  offerRowColumns,
  publishTouched,
  refuseAction,
} from "./state";
import { fetchOffers, offerItemCards, toOfferView } from "./view";

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
  const firstCtx =
    startCtx ?? (addressed.empty ? await prepareFirst(me, meCreatedAt, partnerId) : null);
  const [safety, addresses] = await Promise.all([
    startCtx ? startCtx.safety : chatSafety(me, partnerId),
    linkedAddresses([me, partnerId]),
  ]);
  const myAddresses = addresses.get(me)!;
  if (myAddresses.size === 0) refuseOffer("no_address");
  refuseUnsafe("send", safety);

  const [entries, kept, hasLists] = await Promise.all([
    allowedEntries(
      addressed,
      input.get.map((item) => item.collectionSlug),
    ),
    keptGives(addressed, me),
    partnerHasLists(partnerId),
  ]);
  const getRows = input.get.map((item) => {
    const entry = matchEntry(item, entries);
    if (entry) {
      // a token reached only through a collection entry: the picker names it only where serials show
      const byCollection = item.objektId !== undefined && entry.objektId === null;
      return { item, listId: entry.listId, kept: false, byCollection };
    }
    const keeps =
      item.objektId !== undefined && kept?.objekts.get(item.objektId) === item.collectionSlug;
    if (!keeps && hasLists) {
      refuseOffer("not_listed", item.objektId ? { objektIds: [item.objektId] } : {});
    }
    return { item, listId: null, kept: keeps, byCollection: false };
  });
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
  await checkItems(items, {
    giverId: (side) => (side === "give" ? me : partnerId),
    // a kept objekt was the partner's own offer, so it may sit anywhere they hold it
    holders: (side) => {
      if (side === "give") return myAddresses;
      return collectionAddrs && keptIds.size === 0
        ? new Set(collectionAddrs.serials)
        : partnerAddresses;
    },
    copyHolders: (side) => (side === "give" ? myAddresses : partnerAddresses),
    // any copy from a collection is counted where serials are hidden, as the picker counts it
    getCopyHolders: collectionAddrs ? new Set(collectionAddrs.hidden) : undefined,
    getScope: collectionAddrs ? undefined : anyCopyScope(entries),
  });

  const specificIds = items.flatMap((item) => (item.objektId ? [item.objektId] : []));
  const holders = await openOfferHolders(specificIds);
  const warnings = specificIds.flatMap((objektId) => {
    const offerIds = (holders.get(objektId) ?? [])
      .filter((h) => h.conversationId !== addressed.conversationId)
      .map((h) => h.offerId);
    return offerIds.length > 0 ? [{ objektId, offerIds }] : [];
  });

  const name = await partyNames([me, partnerId]);
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
  const row = await findOffer(offerId, me);
  const partnerId = row.fromUserId === me ? row.toUserId : row.fromUserId;
  const safety = await chatSafety(me, partnerId);
  refuseAction(row, me, action, now, { tradeBlocked: safety.tradeBlocked });
  const name = await partyNames([me]);

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
  const [found, limits] = await Promise.all([fetchOffers(ids), actorLimits(me)]);
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
