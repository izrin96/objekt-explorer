import { db } from "@repo/db";
import { offer, trade, tradeLeg } from "@repo/db/schema";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";

import { shownCancelReason } from "../../lib/offer-rules";
import {
  HISTORY_PAGE_SIZE,
  type HistoryCursor,
  type MineRow,
  type Progress,
} from "../../schemas/offer";
import { fetchPartners, hydrateCards } from "../chat";
import { offersOf, openOffersWhere } from "./cancel";
import { progressColumns } from "./trade-row";
import { fetchOffers, offerItemCards, topupView, itemViews } from "./view";

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

/** Open offers waiting on `me` to answer. */
export const needsYouWhere = (me: string) =>
  and(openOffersWhere(offersOf(me)), eq(offer.toUserId, me));

export const inProgressWhere = (me: string) =>
  and(or(eq(trade.userA, me), eq(trade.userB, me)), eq(trade.status, "in_progress"));

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
          .where(openOffersWhere(offersOf(me)))
          .orderBy(desc(offer.createdAt))
          .limit(GROUP_LIMIT * 2),
        db
          .select({
            id: trade.id,
            offerId: trade.offerId,
            at: sql<string>`${trade.acceptedAt}::text`,
          })
          .from(trade)
          .where(inProgressWhere(me))
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
    cancelReason: shownCancelReason(row.cancel_reason),
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
    hydrateCards(offerItemCards(offers.values()), me),
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
