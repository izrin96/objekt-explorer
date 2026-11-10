import { db } from "@repo/db";
import { trade, tradeLeg } from "@repo/db/schema";
import { desc, inArray } from "drizzle-orm";

import { iso } from "../../lib/time";
import { hydrateCards } from "../chat";
import { legCardRefs } from "../offer/trade-row";
import { autoAcceptedLegs } from "../offer/verify";

/**
 * Trades as they stand, relative to no one: status, legs with giver and receiver, hashes and
 * times, and never message text or an offer note.
 */
export async function tradeDetail(tradeIds: number[]) {
  const ids = [...new Set(tradeIds)];
  if (ids.length === 0) return { trades: [], collections: {} };
  const [rows, legs, autoLegs] = await Promise.all([
    db
      .select({
        id: trade.id,
        offerId: trade.offerId,
        status: trade.status,
        cancelReason: trade.cancelReason,
        cancelledBy: trade.cancelledBy,
        userA: trade.userA,
        userB: trade.userB,
        acceptedAt: trade.acceptedAt,
        endedAt: trade.endedAt,
      })
      .from(trade)
      .where(inArray(trade.id, ids))
      .orderBy(desc(trade.acceptedAt)),
    db.select().from(tradeLeg).where(inArray(tradeLeg.tradeId, ids)).orderBy(tradeLeg.id),
    autoAcceptedLegs(ids),
  ]);
  const { serial, collections } = await hydrateCards(legCardRefs(legs), null);
  return {
    trades: rows.map((t) => ({
      id: t.id,
      offerId: t.offerId,
      status: t.status,
      cancelReason: t.cancelReason,
      cancelledBy: t.cancelledBy,
      userA: t.userA,
      userB: t.userB,
      acceptedAt: iso(t.acceptedAt)!,
      endedAt: iso(t.endedAt),
      legs: legs
        .filter((leg) => leg.tradeId === t.id)
        .map((leg) => {
          const swapped =
            leg.objektId !== null &&
            leg.verifiedObjektId !== null &&
            leg.verifiedObjektId !== leg.objektId
              ? serial(leg.verifiedObjektId)
              : null;
          return {
            id: leg.id,
            fromUserId: leg.fromUserId,
            toUserId: leg.toUserId,
            collectionSlug: leg.collectionSlug,
            objektId: leg.objektId,
            serial: leg.objektId === null ? null : serial(leg.objektId).serial,
            serialEstimated: leg.objektId === null ? false : serial(leg.objektId).estimated,
            state: (leg.verifiedAt !== null ? "verified" : leg.open ? "waiting" : "closed") as
              | "verified"
              | "waiting"
              | "closed",
            verifiedAt: iso(leg.verifiedAt),
            confirmedAt: iso(leg.confirmedAt),
            txHash: leg.txHash,
            verifiedObjektId: leg.verifiedObjektId,
            /** set when the leg verified through a wrong copy */
            verifiedSerial: swapped?.serial ?? null,
            verifiedSerialEstimated: swapped?.estimated ?? false,
            autoAccepted: autoLegs.has(leg.id),
            awayAt: iso(leg.awayAt),
            untransferableAt: iso(leg.untransferableAt),
          };
        }),
    })),
    collections,
  };
}
