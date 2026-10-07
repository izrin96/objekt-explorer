import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { transfers } from "@repo/db/indexer/schema";
import { conversation, offer, offerItem, trade, tradeLeg, userSanction } from "@repo/db/schema";
import { and, eq, gt, gte, inArray, ne, or, sql } from "drizzle-orm";

import {
  type ActorLimits,
  actionRefusal,
  anyCopyShortfall,
  createEffect,
  effectiveStatus,
  firstItemRefusal,
  itemVerdict,
  validateShape,
} from "../lib/offer-rules";
import { scanMessage } from "../lib/scam-patterns";
import { type FlagCategory } from "../schemas/chat";
import {
  type CreateOfferInput,
  type OfferAction,
  type OfferCancelReason,
  type OfferEvent,
  type OfferStatus,
  OPEN_OFFER_LIMIT,
} from "../schemas/offer";
import { publishNotify } from "../user-socket";
import {
  appendMessage,
  chatSafety,
  checkMessageRate,
  checkStart,
  ensureConversation,
  hydrateCards,
  publishChatChanged,
} from "./chat";
import { getUsdRates } from "./currency-rates";
import {
  type Tx,
  unique,
  refuseOffer,
  refuseUnsafe,
  linkedAddresses,
  fetchObjekts,
  fetchCopies,
  reservedIds,
  openAnyCopyLegs,
  copyKey,
  openOfferHolders,
  resolveAddressed,
  allowedEntries,
} from "./offer-core";
import { partyNames, writeNotes } from "./offer-notes";
import { matchEntry, counteredGives } from "./offer-picker";
import { fetchOffers, offerItemCards, toOfferView } from "./offer-view";
import { activeSanctionWhere } from "./safety";

type OfferRow = {
  id: number;
  conversationId: number;
  fromUserId: string;
  toUserId: string;
  status: OfferStatus;
  expiresAt: string;
  createdAt: string;
};

const offerRowColumns = {
  id: offer.id,
  conversationId: offer.conversationId,
  fromUserId: offer.fromUserId,
  toUserId: offer.toUserId,
  status: sql<OfferStatus>`${offer.status}`,
  expiresAt: offer.expiresAt,
  createdAt: offer.createdAt,
};

/** NOT_FOUND unless the viewer is one of the offer's two parties. */
async function findOffer(offerId: number, me: string): Promise<OfferRow> {
  const [row] = await db
    .select(offerRowColumns)
    .from(offer)
    .where(and(eq(offer.id, offerId), or(eq(offer.fromUserId, me), eq(offer.toUserId, me))));
  if (!row) throw new ORPCError("NOT_FOUND");
  return row;
}

async function lockConversation(tx: Tx, conversationId: number) {
  await tx
    .select({ id: conversation.id })
    .from(conversation)
    .where(eq(conversation.id, conversationId))
    .for("update");
}

const refuseAction = (
  row: OfferRow,
  me: string,
  action: OfferAction,
  now: Date,
  limits: ActorLimits = {},
) => {
  const reason = actionRefusal(row, me, action, now, limits);
  if (reason) refuseOffer(reason);
};

type Side = "give" | "get";
type ItemRow = { side: Side; collectionSlug: string; objektId: string | null };

type ItemParties = {
  giverId: (side: Side) => string;
  /** where a side's specific objekts may sit */
  holders: (side: Side) => ReadonlySet<string>;
  /** where a side's any-copy copies are counted */
  copyHolders: (side: Side) => ReadonlySet<string>;
  /**
   * Accept only: a specific objekt the giver already sent to the receiver after the offer
   * was made counts as held, so an early sender doesn't sink their own trade.
   */
  sent?: { since: string; receivers: (side: Side) => ReadonlySet<string> };
};

/** Specific objekts that went from the side's giver to its receiver at or after `since`. */
async function sentEarly(items: ItemRow[], parties: ItemParties) {
  const sent = new Set<string>();
  if (!parties.sent || items.length === 0) return sent;
  const { since, receivers } = parties.sent;
  const rows = await Promise.all(
    (["give", "get"] as const).map((side) => {
      const ids = items.filter((i) => i.side === side).map((i) => i.objektId!);
      const from = [...parties.holders(side)];
      const to = [...receivers(side)];
      if (ids.length === 0 || from.length === 0 || to.length === 0) return Promise.resolve([]);
      return indexer
        .select({ objektId: transfers.objektId })
        .from(transfers)
        .where(
          and(
            inArray(transfers.objektId, ids),
            inArray(transfers.from, from),
            inArray(transfers.to, to),
            gte(transfers.timestamp, since),
          ),
        );
    }),
  );
  for (const row of rows.flat()) if (row.objektId) sent.add(row.objektId);
  return sent;
}

type CopyNeed = { side: Side; giverId: string; available: Map<string, number> };

/**
 * Specific objekts must sit with the side that gives them, transferable and unreserved;
 * any-copy items need as many such copies, beyond the ones named and the ones already
 * promised to open any-copy legs, as the offer asks for. Returns the copies counted before
 * the promised ones, so accept can recheck those under its lock.
 */
async function checkItems(
  items: ItemRow[],
  parties: ItemParties,
  tx: Tx | typeof db = db,
): Promise<CopyNeed[]> {
  const specific = items.filter((item) => item.objektId !== null);
  const anyCopy = items.filter((item) => item.objektId === null);
  const slugsOf = (side: Side) =>
    unique(anyCopy.filter((item) => item.side === side).map((item) => item.collectionSlug));
  const [found, copies] = await Promise.all([
    fetchObjekts(specific.map((item) => item.objektId!)),
    Promise.all(
      (["give", "get"] as const).map((side) =>
        fetchCopies(slugsOf(side), [...parties.copyHolders(side)]),
      ),
    ),
  ]);
  const reserved = await reservedIds(
    [...specific.map((item) => item.objektId!), ...copies.flat().map((o) => o.id)],
    tx,
  );
  const elsewhere = specific.filter((item) => {
    const owner = found.get(item.objektId!)?.owner;
    return owner !== undefined && parties.sent?.receivers(item.side).has(owner);
  });
  const early = await sentEarly(elsewhere, parties);

  const refusal = firstItemRefusal(
    specific.map((item) => {
      const objekt = found.get(item.objektId!);
      const valid = objekt && objekt.slug === item.collectionSlug ? objekt : undefined;
      return {
        objektId: item.objektId!,
        verdict: early.has(item.objektId!)
          ? "ok"
          : itemVerdict(valid, parties.holders(item.side), reserved.has(item.objektId!)),
      };
    }),
  );
  if (refusal) refuseOffer(refusal.reason, { objektIds: refusal.objektIds });

  const named = new Set(specific.map((item) => item.objektId!));
  const needs = (["give", "get"] as const).map((side, i): CopyNeed => {
    const available = new Map<string, number>();
    for (const copy of copies[i]!) {
      if (!copy.transferable || reserved.has(copy.id) || named.has(copy.id)) continue;
      available.set(copy.slug, (available.get(copy.slug) ?? 0) + 1);
    }
    return { side, giverId: parties.giverId(side), available };
  });
  await refuseCopyShortfall(anyCopy, needs, tx);
  return needs;
}

async function refuseCopyShortfall(anyCopy: ItemRow[], needs: CopyNeed[], tx: Tx | typeof db) {
  if (anyCopy.length === 0) return;
  const promised = await openAnyCopyLegs(
    needs.map((need) => ({
      userId: need.giverId,
      slugs: unique(anyCopy.filter((i) => i.side === need.side).map((i) => i.collectionSlug)),
    })),
    tx,
  );
  const short = needs.flatMap((need) => {
    const left = new Map(
      [...need.available].map(([slug, n]) => [
        slug,
        n - (promised.get(copyKey(need.giverId, slug)) ?? 0),
      ]),
    );
    return anyCopyShortfall(
      anyCopy.filter((item) => item.side === need.side),
      left,
    );
  });
  if (short.length > 0) refuseOffer("not_owned", { collectionSlugs: unique(short) });
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
  const [safety, addresses] = await Promise.all([
    startCtx ? startCtx.safety : chatSafety(me, partnerId),
    linkedAddresses([me, partnerId]),
  ]);
  const myAddresses = addresses.get(me)!;
  if (myAddresses.size === 0) refuseOffer("no_address");
  refuseUnsafe("send", safety);

  const [entries, kept] = await Promise.all([
    allowedEntries(
      addressed,
      input.get.map((item) => item.collectionSlug),
    ),
    counteredGives(addressed.conversationId, me),
  ]);
  const getRows = input.get.map((item) => {
    const entry = matchEntry(item, entries);
    if (entry) return { item, listId: entry.listId, kept: false };
    const keeps =
      item.objektId !== undefined && kept?.objekts.get(item.objektId) === item.collectionSlug;
    if (!keeps) refuseOffer("not_listed", item.objektId ? { objektIds: [item.objektId] } : {});
    return { item, listId: null, kept: true };
  });
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
  await checkItems(items, {
    giverId: (side) => (side === "give" ? me : partnerId),
    holders: (side) => (side === "give" ? myAddresses : addresses.get(partnerId)!),
    copyHolders: (side) => (side === "give" ? myAddresses : addresses.get(partnerId)!),
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
      let conversationId: number;
      let created = false;
      if (startCtx) {
        const existingId = await checkStart(tx, startCtx);
        ({ id: conversationId, created } = await ensureConversation(
          tx,
          startCtx,
          existingId,
          true,
        ));
      } else {
        conversationId = addressed.conversationId!;
      }
      await lockConversation(tx, conversationId);
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('offer_open'), hashtext(${me}))`);

      const [current] = await tx
        .select(offerRowColumns)
        .from(offer)
        .where(and(eq(offer.conversationId, conversationId), eq(offer.status, "open")));
      let open: OfferRow | null = current ?? null;
      if (open && effectiveStatus(open, now) === "expired") {
        await tx.update(offer).set({ status: "expired" }).where(eq(offer.id, open.id));
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
          side: "give",
          collectionSlug: item.collectionSlug,
          objektId: item.objektId,
        })),
        ...getRows.map(({ item, listId }) => ({
          offerId,
          side: "get",
          collectionSlug: item.collectionSlug,
          objektId: item.objektId ?? null,
          listId,
        })),
      ]);
      await appendMessage(tx, conversationId, me, null, null, caution, offerId);

      const notified = await writeNotes(tx, [
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

function reservedConflict(error: unknown): string[] | null {
  let cause: unknown = error;
  while (cause instanceof Error) {
    const pg = cause as Error & { code?: string; constraint?: string; detail?: string };
    if (pg.code === "23505" && pg.constraint === "trade_leg_reserved") {
      const match = pg.detail?.match(/=\((.+)\)/);
      return match ? [match[1]!] : [];
    }
    // two accepts reserving shared objekts can still wait on each other's other legs
    if (pg.code === "40P01") return [];
    cause = cause.cause;
  }
  return null;
}

/** The pair's chat and both members' bells hear about every offer a change touched. */
export async function publishTouched(
  conversations: { conversationId: number; userIds: string[] }[],
  notified: string[],
) {
  await Promise.all([
    ...conversations.map((c) => publishChatChanged(c.userIds, c.conversationId)),
    ...unique(notified).map((userId) => publishNotify(userId)),
  ]);
}

export async function acceptOffer(me: string, offerId: number) {
  const now = new Date();
  const row = await findOffer(offerId, me);
  const partnerId = row.fromUserId === me ? row.toUserId : row.fromUserId;
  const safety = await chatSafety(me, partnerId);
  refuseAction(row, me, "accept", now, { tradeBlocked: safety.tradeBlocked });
  refuseUnsafe("accept", safety);

  const [items, addresses] = await Promise.all([
    db
      .select({
        side: sql<"give" | "get">`${offerItem.side}`,
        collectionSlug: offerItem.collectionSlug,
        objektId: offerItem.objektId,
      })
      .from(offerItem)
      .where(eq(offerItem.offerId, offerId))
      .orderBy(offerItem.id),
    linkedAddresses([row.fromUserId, row.toUserId]),
  ]);
  const fromAddresses = addresses.get(row.fromUserId)!;
  const toAddresses = addresses.get(row.toUserId)!;
  if (toAddresses.size === 0 || fromAddresses.size === 0) refuseOffer("no_address");
  const holdersOf = (side: Side) => (side === "give" ? fromAddresses : toAddresses);
  // read before the lock: the indexer is another database, and a token that moves after
  // this read is caught by the verifier
  const copyNeeds = await checkItems(items, {
    giverId: (side) => (side === "give" ? row.fromUserId : row.toUserId),
    holders: holdersOf,
    copyHolders: holdersOf,
    sent: {
      since: row.createdAt,
      receivers: (side) => (side === "give" ? toAddresses : fromAddresses),
    },
  });
  const anyCopy = items.filter((item) => item.objektId === null);
  const name = await partyNames([row.fromUserId, row.toUserId]);

  const result = await db.transaction(async (tx) => {
    await lockConversation(tx, row.conversationId);
    const [fresh] = await tx.select(offerRowColumns).from(offer).where(eq(offer.id, offerId));
    refuseAction(fresh!, me, "accept", now);

    // any-copy legs reserve no token, so a giver's copies are counted under a lock per giver,
    // taken in id order
    const givers = unique(
      anyCopy.map((item) => (item.side === "give" ? row.fromUserId : row.toUserId)),
    ).toSorted();
    for (const giverId of givers) {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext('any_copy'), hashtext(${giverId}))`,
      );
    }
    await refuseCopyShortfall(anyCopy, copyNeeds, tx);

    const [created] = await tx
      .insert(trade)
      .values({ offerId, userA: row.fromUserId, userB: row.toUserId })
      .returning({ id: trade.id });
    const tradeId = created!.id;

    const snapshot = (addresses: ReadonlySet<string>) => [...addresses].toSorted();
    try {
      // a fixed order, so two accepts over the same objekts wait instead of deadlocking
      const ordered = items.toSorted((a, b) =>
        a.objektId === b.objektId
          ? 0
          : a.objektId === null
            ? 1
            : b.objektId === null
              ? -1
              : a.objektId < b.objektId
                ? -1
                : 1,
      );
      await tx.insert(tradeLeg).values(
        ordered.map((item) => {
          const fromSender = item.side === "give";
          return {
            tradeId,
            fromUserId: fromSender ? row.fromUserId : row.toUserId,
            toUserId: fromSender ? row.toUserId : row.fromUserId,
            fromAddresses: snapshot(fromSender ? fromAddresses : toAddresses),
            toAddresses: snapshot(fromSender ? toAddresses : fromAddresses),
            collectionSlug: item.collectionSlug,
            objektId: item.objektId,
          };
        }),
      );
    } catch (error) {
      const taken = reservedConflict(error);
      if (taken === null) throw error;
      refuseOffer("reserved", { objektIds: taken });
    }

    const accepted = await tx
      .update(offer)
      .set({ status: "accepted", respondedAt: sql`now()` })
      .where(and(eq(offer.id, offerId), eq(offer.status, "open")))
      .returning({ id: offer.id });
    if (accepted.length === 0) refuseOffer("not_open");

    const specificIds = items.flatMap((item) => (item.objektId ? [item.objektId] : []));
    const cancelled =
      specificIds.length === 0
        ? []
        : await tx
            .update(offer)
            .set({ status: "cancelled", cancelReason: "reserved", respondedAt: sql`now()` })
            .where(
              and(
                eq(offer.status, "open"),
                ne(offer.id, offerId),
                gt(offer.expiresAt, sql`now()`),
                inArray(
                  offer.id,
                  tx
                    .select({ id: offerItem.offerId })
                    .from(offerItem)
                    .where(inArray(offerItem.objektId, specificIds)),
                ),
              ),
            )
            .returning({
              id: offer.id,
              conversationId: offer.conversationId,
              fromUserId: offer.fromUserId,
              toUserId: offer.toUserId,
            });

    const others = cancelled.length
      ? await partyNames(cancelled.flatMap((o) => [o.fromUserId, o.toUserId]))
      : name;
    const notified = await writeNotes(tx, [
      {
        type: "offer",
        userId: row.fromUserId,
        payload: {
          offerId,
          conversationId: row.conversationId,
          tradeId,
          event: "accepted",
          reason: null,
          partner: name(row.toUserId),
        },
      },
      ...cancelled.flatMap((o) =>
        [
          [o.fromUserId, o.toUserId],
          [o.toUserId, o.fromUserId],
        ].map(([userId, other]) => ({
          type: "offer" as const,
          userId: userId!,
          payload: {
            offerId: o.id,
            conversationId: o.conversationId,
            tradeId: null,
            event: "cancelled" as const,
            reason: "reserved" as const,
            partner: others(other!),
          },
        })),
      ),
    ]);
    return { tradeId, cancelled, notified };
  });

  await publishTouched(
    [
      { conversationId: row.conversationId, userIds: [row.fromUserId, row.toUserId] },
      ...result.cancelled.map((o) => ({
        conversationId: o.conversationId,
        userIds: [o.fromUserId, o.toUserId],
      })),
    ],
    result.notified,
  );
  return { tradeId: result.tradeId };
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

/**
 * Cancels every open offer matching `where` with `reason`, notifying both parties of each,
 * inside the caller's transaction; the caller publishes the result after commit.
 */
export async function cancelOpenOffers(
  tx: Tx,
  where: ReturnType<typeof and>,
  reason: OfferCancelReason,
) {
  const cancelled = await tx
    .update(offer)
    .set({ status: "cancelled", cancelReason: reason, respondedAt: sql`now()` })
    .where(and(eq(offer.status, "open"), gt(offer.expiresAt, sql`now()`), where))
    .returning({
      id: offer.id,
      conversationId: offer.conversationId,
      fromUserId: offer.fromUserId,
      toUserId: offer.toUserId,
    });
  if (cancelled.length === 0) return { conversations: [], notified: [] };
  const name = await partyNames(cancelled.flatMap((o) => [o.fromUserId, o.toUserId]));
  const notified = await writeNotes(
    tx,
    cancelled.flatMap((o) =>
      [
        [o.fromUserId, o.toUserId],
        [o.toUserId, o.fromUserId],
      ].map(([userId, other]) => ({
        type: "offer" as const,
        userId: userId!,
        payload: {
          offerId: o.id,
          conversationId: o.conversationId,
          tradeId: null,
          event: "cancelled" as OfferEvent,
          reason,
          partner: name(other!),
        },
      })),
    ),
  );
  return {
    conversations: cancelled.map((o) => ({
      conversationId: o.conversationId,
      userIds: [o.fromUserId, o.toUserId],
    })),
    notified,
  };
}

export type CancelResult = Awaited<ReturnType<typeof cancelOpenOffers>>;

export const offersBetween = (a: string, b: string) =>
  or(
    and(eq(offer.fromUserId, a), eq(offer.toUserId, b)),
    and(eq(offer.fromUserId, b), eq(offer.toUserId, a)),
  );

export const offersOf = (userId: string) =>
  or(eq(offer.fromUserId, userId), eq(offer.toUserId, userId));

export async function publishCancelled(result: CancelResult) {
  await publishTouched(result.conversations, result.notified);
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
  const { serial, collections } = await hydrateCards(offerItemCards(mine));
  const now = new Date();
  return {
    offers: mine.map((row) => toOfferView(row, me, now, limits, serial)),
    collections,
  };
}
