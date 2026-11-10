import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import {
  tradeCancelRequest,
  tradeFeedback,
  tradeLeg,
  tradeSubstitute,
  user,
  userAddress,
} from "@repo/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";

import { type HeldBy, heldByProfile } from "../../lib/held-by";
import { isBehind } from "../../lib/indexer-seen";
import {
  atFault,
  cancelRefusal,
  cancelRequestViews,
  canReport,
  rateRefusal,
  suggestFirstSender,
  type TradeParty,
} from "../../lib/offer-rules";
import { DAY_MS, iso } from "../../lib/time";
import { firstPending } from "../../lib/trade-match";
import {
  type CancelRequestStatus,
  RATE_WINDOW_DAYS,
  type TradeRating,
  type TradeView,
  type HeldCopyStatus,
  VERIFIER_LAST_KEY,
  awayBreaksAt,
} from "../../schemas/offer";
import { fetchPartners, hydrateCards } from "../chat";
import { redis, redisFailOpen } from "../redis";
import { reputationOf } from "../reputation";
import { fetchObjekts } from "./core";
import { legCardRefs } from "./trade-row";
import { findTrade, readIndexerSeen } from "./trades";
import { autoAcceptedLegs, heldCopyWhere } from "./verify";
import { fetchOffers, topupView } from "./view";

const RATE_WINDOW_MS = RATE_WINDOW_DAYS * DAY_MS;

/** Which of the viewer's profiles holds each objekt they still owe; see `heldByProfile`. */
async function heldByOf(
  me: string,
  legs: (typeof tradeLeg.$inferSelect)[],
  profiles: { address: string; nickname: string | null }[],
) {
  const owed = legs.flatMap((leg) =>
    leg.fromUserId === me && leg.open && leg.verifiedAt === null && leg.objektId !== null
      ? [leg.objektId]
      : [],
  );
  if (owed.length === 0 || profiles.length < 2) return new Map<string, HeldBy>();
  const objekts = await fetchObjekts(owed);
  return heldByProfile(new Map([...objekts].map(([id, objekt]) => [id, objekt.owner])), profiles);
}

export async function fetchTrade(me: string, tradeId: number) {
  const now = new Date();
  const row = await findTrade(tradeId, me);
  const { partnerId } = row;

  const [
    offers,
    legs,
    substitutes,
    autoLegs,
    partners,
    reputations,
    accounts,
    [feedback],
    lastChecked,
    seen,
    profiles,
    cancelRows,
  ] = await Promise.all([
    fetchOffers([row.offerId], me),
    db.select().from(tradeLeg).where(eq(tradeLeg.tradeId, tradeId)).orderBy(tradeLeg.id),
    db
      .select({
        id: tradeSubstitute.id,
        legId: tradeSubstitute.tradeLegId,
        objektId: tradeSubstitute.objektId,
        txHash: tradeSubstitute.txHash,
        at: tradeSubstitute.transferredAt,
        status: sql<HeldCopyStatus>`${tradeSubstitute.status}`,
        acceptBy: tradeSubstitute.acceptBy,
      })
      .from(tradeSubstitute)
      .innerJoin(tradeLeg, eq(tradeLeg.id, tradeSubstitute.tradeLegId))
      .where(and(eq(tradeLeg.tradeId, tradeId), heldCopyWhere))
      .orderBy(tradeSubstitute.transferredAt, tradeSubstitute.id),
    autoAcceptedLegs([tradeId]),
    fetchPartners([partnerId]),
    reputationOf([row.userA, row.userB]),
    db
      .select({ id: user.id, createdAt: user.createdAt })
      .from(user)
      .where(inArray(user.id, [row.userA, row.userB])),
    db
      .select({ rating: sql<TradeRating>`${tradeFeedback.rating}` })
      .from(tradeFeedback)
      .where(and(eq(tradeFeedback.tradeId, tradeId), eq(tradeFeedback.fromUserId, me))),
    redisFailOpen("verifier last", () => redis.get(VERIFIER_LAST_KEY)),
    readIndexerSeen(),
    row.status === "in_progress"
      ? db
          .select({ address: userAddress.address, nickname: userAddress.nickname })
          .from(userAddress)
          .where(eq(userAddress.userId, me))
      : [],
    db
      .select({
        askedBy: tradeCancelRequest.askedBy,
        askedAt: tradeCancelRequest.askedAt,
        status: sql<CancelRequestStatus>`${tradeCancelRequest.status}`,
        answeredAt: tradeCancelRequest.answeredAt,
      })
      .from(tradeCancelRequest)
      .where(eq(tradeCancelRequest.tradeId, tradeId))
      .orderBy(tradeCancelRequest.askedAt, tradeCancelRequest.id),
  ]);
  const source = offers.get(row.offerId)!;
  const partner = partners.get(partnerId);
  if (!partner) throw new ORPCError("NOT_FOUND");
  const slugOf = new Map(legs.map((leg) => [leg.id, leg.collectionSlug]));
  const [heldBy, { serial: serialOf, collections }] = await Promise.all([
    heldByOf(me, legs, profiles),
    hydrateCards(
      [
        ...legCardRefs(legs),
        ...substitutes.map((sub) => ({
          collectionSlug: slugOf.get(sub.legId)!,
          objektId: sub.objektId,
        })),
      ],
      me,
    ),
  ]);
  const held = substitutes.length;

  const verified = legs.filter((leg) => leg.verifiedAt !== null).length;
  const state = {
    ...row,
    verifiedLegs: verified,
    confirmedLegs: legs.filter((leg) => leg.confirmedAt !== null).length,
  };
  const createdAt = new Map(accounts.map((a) => [a.id, a.createdAt]));
  const party = (id: string): TradeParty => ({
    userId: id,
    verified: reputations.get(id)?.verified ?? 0,
    unfinished: reputations.get(id)?.unfinished ?? 0,
    createdAt: createdAt.get(id) ?? new Date(0),
  });
  const first =
    row.status === "in_progress"
      ? suggestFirstSender(row, legs, new Map([row.userA, row.userB].map((id) => [id, party(id)])))
      : null;
  const behind = row.status === "in_progress" && isBehind(seen, now.getTime());
  const cancel = cancelRefusal(state, behind, held);

  const result: TradeView = {
    id: row.id,
    offerId: row.offerId,
    conversationId: source.conversation_id,
    partner: { ...partner, reputation: reputations.get(partnerId) ?? null },
    status: row.status,
    cancelReason: row.cancelReason,
    cancelledByYou: row.cancelledBy === null ? null : row.cancelledBy === me,
    proposedAt: iso(source.created_at)!,
    acceptedAt: iso(row.acceptedAt)!,
    endedAt: iso(row.endedAt),
    topup: topupView(source, source.from_user_id === me),
    note: source.note,
    legs: legs.map((leg) => {
      const shown = leg.objektId === null ? null : serialOf(leg.objektId);
      const swapped =
        leg.objektId !== null &&
        leg.verifiedObjektId !== null &&
        leg.verifiedObjektId !== leg.objektId
          ? serialOf(leg.verifiedObjektId)
          : null;
      const subs = leg.open ? substitutes.filter((sub) => sub.legId === leg.id) : [];
      // only the earliest pending copy can be accepted, so only it shows a date
      const due = firstPending(subs);
      return {
        id: leg.id,
        collectionSlug: leg.collectionSlug,
        objektId: leg.objektId,
        serial: shown?.serial ?? null,
        serialEstimated: shown?.estimated ?? false,
        fromYou: leg.fromUserId === me,
        open: leg.open,
        state: leg.verifiedAt !== null ? "verified" : leg.open ? "waiting" : "closed",
        stuck: leg.open && leg.untransferableAt !== null,
        away:
          leg.open && leg.awayAt !== null
            ? { at: iso(leg.awayAt)!, breaksAt: awayBreaksAt(leg.awayAt) }
            : null,
        heldBy: (leg.objektId !== null && heldBy.get(leg.objektId)) || null,
        verifiedAt: iso(leg.verifiedAt),
        confirmedAt: iso(leg.confirmedAt),
        txHash: leg.txHash,
        verifiedObjektId: leg.verifiedObjektId,
        verifiedSerial: swapped?.serial ?? null,
        verifiedSerialEstimated: swapped?.estimated ?? false,
        autoAccepted: autoLegs.has(leg.id),
        substitutes: subs.map((sub) => {
          const sent = serialOf(sub.objektId);
          return {
            id: sub.id,
            objektId: sub.objektId,
            serial: sent.serial,
            serialEstimated: sent.estimated,
            txHash: sub.txHash,
            at: iso(sub.at)!,
            status: sub.status,
            acceptBy: sub === due ? iso(sub.acceptBy) : null,
          };
        }),
      };
    }),
    progress: { verified, total: legs.length },
    firstSender: first && { userId: first.userId, you: first.userId === me, sent: first.sent },
    canCancel: cancel === null,
    cancelLocked: cancel === "locked",
    seenUntil: seen?.seenUntil ?? null,
    indexerBehind: behind,
    canReport: canReport(state, now),
    rating: feedback?.rating ?? null,
    canRate: rateRefusal(state, now, me, atFault(legs, row.userA, row.userB)) === null,
    rateUntil:
      (row.status === "completed" || row.status === "failed") && row.endedAt
        ? new Date(new Date(row.endedAt).getTime() + RATE_WINDOW_MS).toISOString()
        : null,
    lastCheckedAt: lastChecked,
    ...cancelRequestViews(cancelRows, me, row.status === "in_progress", now),
  };
  return { trade: result, collections };
}
