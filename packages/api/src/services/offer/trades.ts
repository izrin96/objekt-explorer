import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { offer, trade, tradeFeedback, tradeLeg, user } from "@repo/db/schema";
import { and, desc, eq, gt, inArray, or, sql } from "drizzle-orm";

import { isBehind, parseIndexerSeen } from "../../lib/indexer-seen";
import {
  cancelRefusal,
  canReport,
  firstSender,
  rateRefusal,
  type TradeParty,
} from "../../lib/offer-rules";
import { DAY_MS, iso } from "../../lib/time";
import {
  HISTORY_PAGE_SIZE,
  type HistoryCursor,
  type MineRow,
  type TradeCancelReason,
  RATE_WINDOW_DAYS,
  type TradeRating,
  type TradeStatus,
  type TradeView,
  type Progress,
  INDEXER_SEEN_KEY,
  VERIFIER_LAST_KEY,
} from "../../schemas/offer";
import { chatSafety, fetchPartners, hydrateCards } from "../chat";
import { redis } from "../redis";
import { forgetReputation, reputationOf } from "../reputation";
import { loadOpenLegs, matchOpenLegs } from "../trade-verify";
import { offersOf } from "./cancel";
import { type Tx, refuseOffer } from "./core";
import { partyNames, writeNotes } from "./notes";
import { publishTouched } from "./state";
import { fetchOffers, offerItemCards, topupView, itemViews } from "./view";

const tradeColumns = {
  id: trade.id,
  offerId: trade.offerId,
  userA: trade.userA,
  userB: trade.userB,
  status: sql<TradeStatus>`${trade.status}`,
  cancelReason: sql<TradeCancelReason | null>`${trade.cancelReason}`,
  cancelledBy: trade.cancelledBy,
  acceptedAt: trade.acceptedAt,
  endedAt: trade.endedAt,
};

/** NOT_FOUND unless the viewer is one of the trade's two parties. */
async function findTrade(tradeId: number, me: string) {
  const [row] = await db
    .select({ ...tradeColumns, conversationId: offer.conversationId })
    .from(trade)
    .innerJoin(offer, eq(offer.id, trade.offerId))
    .where(and(eq(trade.id, tradeId), or(eq(trade.userA, me), eq(trade.userB, me))));
  if (!row) throw new ORPCError("NOT_FOUND");
  return { ...row, partnerId: row.userA === me ? row.userB : row.userA };
}

const progressColumns = {
  total: sql<number>`count(*)::int`,
  verified: sql<number>`(count(*) FILTER (WHERE ${tradeLeg.verifiedAt} IS NOT NULL))::int`,
};

const countVerified = (tx: Tx, tradeId: number) =>
  tx
    .select(progressColumns)
    .from(tradeLeg)
    .where(eq(tradeLeg.tradeId, tradeId))
    .then((rows) => rows[0] ?? { total: 0, verified: 0 });

const readIndexerSeen = async () => parseIndexerSeen(await redis.get(INDEXER_SEEN_KEY));

export async function cancelTrade(me: string, tradeId: number) {
  const row = await findTrade(tradeId, me);
  const { partnerId } = row;
  const behind = isBehind(await readIndexerSeen(), Date.now());
  // a transfer the verifier hasn't run on yet locks the trade too, or a party could send
  // nothing back and cancel right after receiving
  // matched with the parties' other trades, as the verifier matches them, so a transfer
  // another trade's leg takes doesn't lock this one
  const legs = await loadOpenLegs([me, partnerId]);
  if (legs.some((leg) => leg.trade_id === tradeId)) {
    const results = await matchOpenLegs(legs);
    const locked = legs.some(
      (leg) => leg.trade_id === tradeId && results.get(leg.id)?.kind === "verified",
    );
    if (locked) refuseOffer("locked");
  }
  const name = await partyNames([me]);

  const notified = await db.transaction(async (tx) => {
    // the verifier settles a trade under this same lock, so a leg it verifies is seen here
    const [locked] = await tx
      .select({ status: sql<TradeStatus>`${trade.status}` })
      .from(trade)
      .where(eq(trade.id, tradeId))
      .for("update");
    const counts = await countVerified(tx, tradeId);
    const refusal = cancelRefusal(
      {
        status: locked!.status,
        acceptedAt: row.acceptedAt,
        endedAt: row.endedAt,
        verifiedLegs: counts.verified,
      },
      behind,
    );
    if (refusal) refuseOffer(refusal);

    await tx
      .update(trade)
      .set({ status: "cancelled", endedAt: sql`now()`, cancelledBy: me, cancelReason: "party" })
      .where(eq(trade.id, tradeId));
    await tx.update(tradeLeg).set({ open: false }).where(eq(tradeLeg.tradeId, tradeId));
    return writeNotes(tx, [
      {
        type: "trade",
        userId: partnerId,
        payload: {
          tradeId,
          offerId: row.offerId,
          conversationId: row.conversationId,
          event: "cancelled",
          reason: "party",
          progress: counts,
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

/** Feedback on a completed trade, changeable for 14 days; only totals are ever shown. */
export async function rateTrade(me: string, tradeId: number, rating: TradeRating) {
  const row = await findTrade(tradeId, me);
  const safety = await chatSafety(me, row.partnerId);
  if (safety.tradeBlocked) refuseOffer("trade_blocked");
  const refusal = rateRefusal({ ...row, verifiedLegs: 0 }, new Date());
  if (refusal) refuseOffer(refusal);

  await db
    .insert(tradeFeedback)
    .values({ tradeId, fromUserId: me, toUserId: row.partnerId, rating })
    .onConflictDoUpdate({
      target: [tradeFeedback.tradeId, tradeFeedback.fromUserId],
      set: { rating, updatedAt: sql`now()` },
    });
  await forgetReputation([me, row.partnerId]);
  return { rating };
}

const RATE_WINDOW_MS = RATE_WINDOW_DAYS * DAY_MS;

/**
 * The suggested first sender among the parties who give a leg: with both giving, by
 * `firstSender`; `sent` when every leg they give is verified.
 */
function suggestFirstSender(
  row: { userA: string; userB: string },
  legs: { fromUserId: string; verifiedAt: string | null }[],
  parties: Map<string, TradeParty>,
) {
  const givers = [row.userA, row.userB].filter((id) => legs.some((leg) => leg.fromUserId === id));
  if (givers.length === 0) return null;
  const userId =
    givers.length === 1
      ? givers[0]!
      : firstSender(parties.get(row.userA)!, parties.get(row.userB)!);
  const theirs = legs.filter((leg) => leg.fromUserId === userId);
  return { userId, sent: theirs.every((leg) => leg.verifiedAt !== null) };
}

export async function fetchTrade(me: string, tradeId: number) {
  const now = new Date();
  const row = await findTrade(tradeId, me);
  const { partnerId } = row;

  const [offers, legs, partners, reputations, accounts, [feedback], lastChecked, seen] =
    await Promise.all([
      fetchOffers([row.offerId]),
      db.select().from(tradeLeg).where(eq(tradeLeg.tradeId, tradeId)).orderBy(tradeLeg.id),
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
      redis.get(VERIFIER_LAST_KEY),
      readIndexerSeen(),
    ]);
  const source = offers.get(row.offerId)!;
  const partner = partners.get(partnerId);
  if (!partner) throw new ORPCError("NOT_FOUND");
  const { serial: serialOf, collections } = await hydrateCards(
    legs.map((leg) =>
      leg.objektId === null
        ? { collectionSlug: leg.collectionSlug }
        : { collectionSlug: leg.collectionSlug, objektId: leg.objektId },
    ),
  );

  const verified = legs.filter((leg) => leg.verifiedAt !== null).length;
  const state = { ...row, verifiedLegs: verified };
  const createdAt = new Map(accounts.map((a) => [a.id, a.createdAt]));
  const party = (id: string): TradeParty => ({
    userId: id,
    verified: reputations.get(id)?.verified ?? 0,
    createdAt: createdAt.get(id) ?? new Date(0),
  });
  const first =
    row.status === "in_progress"
      ? suggestFirstSender(row, legs, new Map([row.userA, row.userB].map((id) => [id, party(id)])))
      : null;
  const behind = row.status === "in_progress" && isBehind(seen, now.getTime());
  const cancel = cancelRefusal(state, behind);

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
    legs: legs.map((leg) => ({
      id: leg.id,
      collectionSlug: leg.collectionSlug,
      objektId: leg.objektId,
      serial: leg.objektId === null ? null : serialOf(leg.objektId),
      fromYou: leg.fromUserId === me,
      open: leg.open,
      state: leg.verifiedAt !== null ? "verified" : leg.open ? "waiting" : "closed",
      verifiedAt: iso(leg.verifiedAt),
      txHash: leg.txHash,
      verifiedObjektId: leg.verifiedObjektId,
    })),
    progress: { verified, total: legs.length },
    firstSender: first && { userId: first.userId, you: first.userId === me, sent: first.sent },
    canCancel: cancel === null,
    cancelLocked: cancel === "locked",
    seenUntil: seen?.seenUntil ?? null,
    indexerBehind: behind,
    canReport: canReport(state, now),
    rating: feedback?.rating ?? null,
    canRate: rateRefusal(state, now) === null,
    rateUntil:
      row.status === "completed" && row.endedAt
        ? new Date(new Date(row.endedAt).getTime() + RATE_WINDOW_MS).toISOString()
        : null,
    lastCheckedAt: lastChecked,
  };
  return { trade: result, collections };
}

type MineEntry = {
  kind: "offer" | "trade";
  id: number;
  offerId: number;
  status: string;
  cancelReason: string | null;
  at: string;
};

type HistoryRow = {
  kind: "offer" | "trade";
  id: number;
  offer_id: number;
  status: string;
  cancel_reason: string | null;
  at: string;
};

const GROUP_LIMIT = 100;

async function fetchProgress(tradeIds: number[]): Promise<Map<number, Progress>> {
  if (tradeIds.length === 0) return new Map();
  const rows = await db
    .select({ tradeId: tradeLeg.tradeId, ...progressColumns })
    .from(tradeLeg)
    .where(inArray(tradeLeg.tradeId, tradeIds))
    .groupBy(tradeLeg.tradeId);
  return new Map(rows.map((row) => [row.tradeId, { verified: row.verified, total: row.total }]));
}

/** Needs you, Waiting on them and In progress on the first page; History paged by `cursor`. */
export async function fetchMine(me: string, cursor: HistoryCursor | undefined) {
  const now = new Date();
  const groupsQuery = cursor
    ? null
    : Promise.all([
        db
          .select({
            id: offer.id,
            toUserId: offer.toUserId,
            at: sql<string>`${offer.createdAt}::text`,
          })
          .from(offer)
          .where(and(offersOf(me), eq(offer.status, "open"), gt(offer.expiresAt, sql`now()`)))
          .orderBy(desc(offer.createdAt))
          .limit(GROUP_LIMIT * 2),
        db
          .select({
            id: trade.id,
            offerId: trade.offerId,
            at: sql<string>`${trade.acceptedAt}::text`,
          })
          .from(trade)
          .where(and(or(eq(trade.userA, me), eq(trade.userB, me)), eq(trade.status, "in_progress")))
          .orderBy(desc(trade.acceptedAt))
          .limit(GROUP_LIMIT),
      ]);

  const history = await db.execute<HistoryRow>(sql`
    SELECT * FROM (
      SELECT 'offer' AS kind, o.id, o.id AS offer_id,
        CASE WHEN o.status = 'open' THEN 'expired' ELSE o.status END AS status,
        o.cancel_reason,
        (CASE WHEN o.status IN ('open', 'expired') THEN o.expires_at ELSE coalesce(o.responded_at, o.created_at) END)::text AS at
      FROM offer o
      WHERE (o.from_user_id = ${me} OR o.to_user_id = ${me})
        AND (o.status IN ('declined', 'withdrawn', 'countered', 'cancelled', 'expired')
          OR (o.status = 'open' AND o.expires_at <= now()))
      UNION ALL
      SELECT 'trade', t.id, t.offer_id, t.status, t.cancel_reason,
        coalesce(t.ended_at, t.accepted_at)::text
      FROM trade t
      WHERE (t.user_a = ${me} OR t.user_b = ${me}) AND t.status <> 'in_progress'
    ) h
    ${cursor ? sql`WHERE (h.at::timestamptz, h.kind, h.id) < (${cursor.at}::timestamptz, ${cursor.kind}, ${cursor.id})` : sql``}
    ORDER BY h.at::timestamptz DESC, h.kind DESC, h.id DESC
    LIMIT ${HISTORY_PAGE_SIZE + 1}
  `);

  const groups = groupsQuery ? await groupsQuery : null;
  const historyPage: MineEntry[] = history.rows.slice(0, HISTORY_PAGE_SIZE).map((row) => ({
    kind: row.kind,
    id: row.id,
    offerId: row.offer_id,
    status: row.status,
    cancelReason: row.cancel_reason,
    at: row.at,
  }));
  const openOffers = groups?.[0] ?? [];
  const inProgress: MineEntry[] = (groups?.[1] ?? []).map((t) => ({
    kind: "trade",
    id: t.id,
    offerId: t.offerId,
    status: "in_progress",
    cancelReason: null,
    at: t.at,
  }));
  const toEntry = (o: (typeof openOffers)[number]): MineEntry => ({
    kind: "offer",
    id: o.id,
    offerId: o.id,
    status: "open",
    cancelReason: null,
    at: o.at,
  });
  const needsYou = openOffers
    .filter((o) => o.toUserId === me)
    .slice(0, GROUP_LIMIT)
    .map(toEntry);
  const waiting = openOffers
    .filter((o) => o.toUserId !== me)
    .slice(0, GROUP_LIMIT)
    .map(toEntry);

  const all = [...needsYou, ...waiting, ...inProgress, ...historyPage];
  const [offers, progressOf] = await Promise.all([
    fetchOffers(all.map((entry) => entry.offerId)),
    fetchProgress(all.flatMap((entry) => (entry.kind === "trade" ? [entry.id] : []))),
  ]);
  const [partners, { serial: serialOf, collections }] = await Promise.all([
    fetchPartners(
      [...offers.values()].map((o) => (o.from_user_id === me ? o.to_user_id : o.from_user_id)),
    ),
    hydrateCards(offerItemCards(offers.values())),
  ]);
  const toRow = (entry: MineEntry): MineRow[] => {
    const source = offers.get(entry.offerId);
    if (!source) return [];
    const partner = partners.get(
      source.from_user_id === me ? source.to_user_id : source.from_user_id,
    );
    if (!partner) return [];
    return [
      {
        kind: entry.kind,
        id: entry.id,
        offerId: entry.offerId,
        tradeId: entry.kind === "trade" ? entry.id : source.trade_id,
        conversationId: source.conversation_id,
        partner,
        status: entry.status as MineRow["status"],
        cancelReason: entry.cancelReason as MineRow["cancelReason"],
        yourTurn: entry.kind === "offer" && entry.status === "open" && source.to_user_id === me,
        ...itemViews(source, me, serialOf),
        topup: topupView(source, source.from_user_id === me),
        progress: entry.kind === "trade" ? (progressOf.get(entry.id) ?? null) : null,
        at: new Date(entry.at).toISOString(),
      },
    ];
  };

  const last = history.rows.length > HISTORY_PAGE_SIZE ? historyPage.at(-1) : undefined;
  return {
    groups: groups
      ? {
          needsYou: needsYou.flatMap(toRow),
          waiting: waiting.flatMap(toRow),
          inProgress: inProgress.flatMap(toRow),
        }
      : null,
    history: {
      items: historyPage.flatMap(toRow),
      nextCursor: last ? { at: last.at, kind: last.kind, id: last.id } : null,
    },
    collections,
    now: now.toISOString(),
  };
}
