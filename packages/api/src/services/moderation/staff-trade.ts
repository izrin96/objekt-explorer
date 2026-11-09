import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import {
  offer,
  tradeCancelRequest,
  tradeLeg,
  tradeSubstitute,
  userSanction,
} from "@repo/db/schema";
import { and, eq, inArray } from "drizzle-orm";

import { staffTimeline } from "../../lib/staff-timeline";
import { staffCopyStatus } from "../../lib/staff-totals";
import { iso } from "../../lib/time";
import { awayBreaksAt } from "../../schemas/offer";
import type { StaffTrade } from "../../schemas/staff-totals";
import { hydrateCards } from "../chat";
import { activeSanctionWhere } from "./safety";
import { tradeDetail } from "./trade-detail";
import { staffPeople } from "./trade-tracking";

/**
 * One trade for staff, whoever the parties are. The offer is read for its id and time only:
 * never its note or caution, and no message of the conversation.
 */
export async function staffTrade(tradeId: number): Promise<StaffTrade> {
  const detail = await tradeDetail([tradeId]);
  const found = detail.trades[0];
  if (!found) throw new ORPCError("NOT_FOUND");
  const parties = [found.userA, found.userB];

  const [[proposal], copies, asks, sanctions, person] = await Promise.all([
    db
      .select({ id: offer.id, createdAt: offer.createdAt })
      .from(offer)
      .where(eq(offer.id, found.offerId)),
    db
      .select({
        id: tradeSubstitute.id,
        legId: tradeSubstitute.tradeLegId,
        objektId: tradeSubstitute.objektId,
        txHash: tradeSubstitute.txHash,
        transferredAt: tradeSubstitute.transferredAt,
        status: tradeSubstitute.status,
        decidedAt: tradeSubstitute.decidedAt,
        acceptBy: tradeSubstitute.acceptBy,
        autoAccepted: tradeSubstitute.autoAccepted,
        legOpen: tradeLeg.open,
      })
      .from(tradeSubstitute)
      .innerJoin(tradeLeg, eq(tradeLeg.id, tradeSubstitute.tradeLegId))
      .where(eq(tradeLeg.tradeId, tradeId))
      .orderBy(tradeSubstitute.transferredAt, tradeSubstitute.id),
    db
      .select({
        askedBy: tradeCancelRequest.askedBy,
        askedAt: tradeCancelRequest.askedAt,
        status: tradeCancelRequest.status,
        answeredAt: tradeCancelRequest.answeredAt,
      })
      .from(tradeCancelRequest)
      .where(eq(tradeCancelRequest.tradeId, tradeId))
      .orderBy(tradeCancelRequest.askedAt, tradeCancelRequest.id),
    db
      .select({ userId: userSanction.userId, type: userSanction.type })
      .from(userSanction)
      .where(and(inArray(userSanction.userId, parties), activeSanctionWhere)),
    staffPeople(parties),
  ]);
  if (!proposal) throw new ORPCError("NOT_FOUND");

  const copyCards = await hydrateCards(
    copies.map((copy) => ({
      collectionSlug: found.legs.find((leg) => leg.id === copy.legId)?.collectionSlug ?? "",
      objektId: copy.objektId,
    })),
    null,
  );

  const timeline = staffTimeline({
    userA: found.userA,
    userB: found.userB,
    proposedAt: proposal.createdAt,
    acceptedAt: found.acceptedAt,
    status: found.status,
    endedAt: found.endedAt,
    cancelReason: found.cancelReason,
    cancelledBy: found.cancelledBy,
    legs: found.legs,
    copies: copies.map((copy) => ({
      legId: copy.legId,
      transferredAt: copy.transferredAt,
      status: copy.status,
      decidedAt: copy.decidedAt,
      autoAccepted: copy.autoAccepted,
    })),
    cancelRequests: asks,
  });

  return {
    id: found.id,
    offerId: proposal.id,
    status: found.status,
    cancelReason: found.cancelReason,
    proposedAt: iso(proposal.createdAt)!,
    acceptedAt: found.acceptedAt,
    endedAt: found.endedAt,
    parties: parties.map((userId) => ({
      person: person(userId),
      sanctions: [
        ...new Set(sanctions.filter((row) => row.userId === userId).map((row) => row.type)),
      ],
    })),
    legs: found.legs.map((leg) => ({
      id: leg.id,
      fromUserId: leg.fromUserId,
      toUserId: leg.toUserId,
      collectionSlug: leg.collectionSlug,
      objektId: leg.objektId,
      serial: leg.serial,
      serialEstimated: leg.serialEstimated,
      state: leg.state,
      verifiedAt: leg.verifiedAt,
      confirmedAt: leg.confirmedAt,
      txHash: leg.txHash,
      verifiedSerial: leg.verifiedSerial,
      verifiedSerialEstimated: leg.verifiedSerialEstimated,
      autoAccepted: leg.autoAccepted,
      awayAt: leg.awayAt,
      breaksAt: leg.awayAt === null || leg.state !== "waiting" ? null : awayBreaksAt(leg.awayAt),
      untransferableAt: leg.untransferableAt,
    })),
    copies: copies.map((copy) => {
      const shown = copyCards.serial(copy.objektId);
      return {
        id: copy.id,
        legId: copy.legId,
        objektId: copy.objektId,
        serial: shown.serial,
        serialEstimated: shown.estimated,
        txHash: copy.txHash,
        transferredAt: iso(copy.transferredAt)!,
        status: staffCopyStatus(copy.status, copy.legOpen),
        decidedAt: iso(copy.decidedAt),
        acceptBy: iso(copy.acceptBy),
        autoAccepted: copy.autoAccepted,
      };
    }),
    cancelRequests: asks.map((ask) => ({
      askedBy: ask.askedBy,
      askedAt: iso(ask.askedAt)!,
      // a request nobody answered before the trade ended another way
      status: ask.status === "pending" && found.status !== "in_progress" ? "lapsed" : ask.status,
      answeredAt: iso(ask.answeredAt),
    })),
    timeline,
    collections: { ...copyCards.collections, ...detail.collections },
  };
}
