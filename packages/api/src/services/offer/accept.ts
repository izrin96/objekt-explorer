import { db } from "@repo/db";
import { offer, offerItem, trade, tradeLeg } from "@repo/db/schema";
import { and, eq, gt, inArray, ne, sql } from "drizzle-orm";

import { unique } from "../../lib/unique";
import { VERIFIER_NUDGE_CHANNEL } from "../../schemas/offer";
import { chatSafety } from "../chat";
import { lockAddresses } from "../cosmo-link";
import { redis } from "../redis";
import { cancelledColumns, cancelledNotes } from "./cancel";
import { linkedAddresses, lockParties, refuseOffer, refuseUnsafe } from "./core";
import { type Side, checkItems, refuseCopyShortfall } from "./items";
import { partyNames, writeNotes } from "./notes";
import {
  findOffer,
  lockConversation,
  offerRowColumns,
  publishTouched,
  refuseAction,
} from "./state";

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

const sameSet = (a: ReadonlySet<string>, b: ReadonlySet<string>) =>
  a.size === b.size && [...a].every((item) => b.has(item));

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
    // the link lock order, before the conversation lock: an unlink can't land between the
    // read above and the legs' address snapshot
    await lockParties(tx, [row.fromUserId, row.toUserId]);
    await lockAddresses(tx, [...fromAddresses, ...toAddresses]);
    const locked = await linkedAddresses([row.fromUserId, row.toUserId], tx);
    if (
      !sameSet(locked.get(row.fromUserId)!, fromAddresses) ||
      !sameSet(locked.get(row.toUserId)!, toAddresses)
    ) {
      refuseOffer("links_changed");
    }
    await lockConversation(tx, row.conversationId);
    const [fresh] = await tx.select(offerRowColumns).from(offer).where(eq(offer.id, offerId));
    refuseAction(fresh!, me, "accept", now);

    // any-copy legs reserve no token, so a giver's copies are counted under a lock per giver,
    // taken in id order; a specific item is counted against those legs too, so every giver
    // takes it
    const givers = unique([row.fromUserId, row.toUserId]).toSorted();
    for (const giverId of givers) {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext('any_copy'), hashtext(${giverId}))`,
      );
    }
    await refuseCopyShortfall(anyCopy, copyNeeds, tx, true);

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
      // the clock read before the indexer reads may be seconds old by now
      .where(and(eq(offer.id, offerId), eq(offer.status, "open"), gt(offer.expiresAt, sql`now()`)))
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
            .returning(cancelledColumns);

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
      ...cancelledNotes(cancelled, "reserved", others),
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
  // not awaited: the client retries forever, so a Valkey outage would hang the accept; the
  // 2-minute rescan still verifies the legs if this is lost
  void redis
    .publish(VERIFIER_NUDGE_CHANNEL, String(result.tradeId))
    .catch((error: unknown) => console.error("[acceptOffer] Failed to nudge the verifier:", error));
  return { tradeId: result.tradeId };
}
