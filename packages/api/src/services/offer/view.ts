import { db } from "@repo/db";
import { sql } from "drizzle-orm";

import {
  type ActorLimits,
  allowedActions,
  effectiveStatus,
  offerSummary,
  topupPayer,
} from "../../lib/offer-rules";
import { iso } from "../../lib/time";
import { unique } from "../../lib/unique";
import { parseCaution, type StoredCard } from "../../schemas/chat";
import type {
  OfferCancelReason,
  OfferStatus,
  OfferView,
  ShownSerial,
  TradeStatus,
} from "../../schemas/offer";

type HydratedOffer = {
  id: number;
  conversation_id: number;
  from_user_id: string;
  to_user_id: string;
  parent_id: number | null;
  status: OfferStatus;
  cancel_reason: OfferCancelReason | null;
  topup_amount: string | null;
  topup_currency: string | null;
  topup_payer: string | null;
  note: string | null;
  caution: string[] | null;
  created_at: string;
  expires_at: string;
  responded_at: string | null;
  trade_id: number | null;
  trade_status: TradeStatus | null;
  trade_progress: { verified: number; total: number } | null;
  latest: boolean;
  items: [side: "give" | "get", slug: string, objektId: string | null, listSlug: string | null][];
};

/** Offers with their items, trade and whether a newer offer exists, in one read. */
export async function fetchOffers(offerIds: number[]): Promise<Map<number, HydratedOffer>> {
  if (offerIds.length === 0) return new Map();
  const result = await db.execute<HydratedOffer>(sql`
    SELECT o.id, o.conversation_id, o.from_user_id, o.to_user_id, o.parent_id, o.status,
      o.cancel_reason, o.topup_amount::text AS topup_amount, o.topup_currency, o.topup_payer,
      o.note, o.caution, o.created_at::text AS created_at, o.expires_at::text AS expires_at,
      o.responded_at::text AS responded_at, t.id AS trade_id, t.status AS trade_status,
      CASE WHEN t.id IS NULL THEN NULL ELSE (
        SELECT json_build_object(
          'verified', count(*) FILTER (WHERE l.verified_at IS NOT NULL), 'total', count(*)
        ) FROM trade_leg l WHERE l.trade_id = t.id
      ) END AS trade_progress,
      NOT EXISTS (
        SELECT 1 FROM offer n WHERE n.conversation_id = o.conversation_id AND n.id > o.id
      ) AS latest,
      coalesce((
        SELECT json_agg(json_build_array(i.side, i.collection_slug, i.objekt_id, l.slug) ORDER BY i.id)
        FROM offer_item i LEFT JOIN lists l ON l.id = i.list_id
        WHERE i.offer_id = o.id
      ), '[]') AS items
    FROM offer o
    LEFT JOIN trade t ON t.offer_id = o.id
    WHERE o.id = ANY(${sql.param(unique(offerIds))}::int[])
  `);
  return new Map(result.rows.map((row) => [row.id, row]));
}

/** Each item as a card, so `hydrateCards` reads serials and collections with the thread's own cards. */
export function offerItemCards(offers: Iterable<HydratedOffer>): StoredCard[] {
  return [...offers].flatMap((o) =>
    o.items.map(([, collectionSlug, objektId]) =>
      objektId === null ? { collectionSlug } : { collectionSlug, objektId },
    ),
  );
}

export function topupView(row: HydratedOffer, viewerIsSender: boolean) {
  if (row.topup_amount === null || row.topup_currency === null || row.topup_payer === null) {
    return null;
  }
  return {
    amount: row.topup_amount,
    currency: row.topup_currency,
    payer: topupPayer(row.topup_payer, viewerIsSender),
  };
}

export function itemViews(
  row: HydratedOffer,
  viewerId: string,
  serialOf: (id: string) => ShownSerial,
) {
  const items = row.items.map(([side, collectionSlug, objektId, listSlug]) => {
    const { serial, estimated } =
      objektId === null ? { serial: null, estimated: false } : serialOf(objektId);
    return {
      side,
      view: { collectionSlug, objektId, serial, serialEstimated: estimated, listSlug },
    };
  });
  const { give, get } = offerSummary(items, row.from_user_id === viewerId);
  return { give: give.map((i) => i.view), get: get.map((i) => i.view) };
}

export function toOfferView(
  row: HydratedOffer,
  viewerId: string,
  now: Date,
  limits: ActorLimits,
  serialOf: (id: string) => ShownSerial,
): OfferView {
  const mine = row.from_user_id === viewerId;
  const state = {
    fromUserId: row.from_user_id,
    toUserId: row.to_user_id,
    status: row.status,
    expiresAt: row.expires_at,
  };
  return {
    id: row.id,
    conversationId: row.conversation_id,
    mine,
    status: effectiveStatus(state, now),
    cancelReason: row.cancel_reason,
    ...itemViews(row, viewerId, serialOf),
    topup: topupView(row, mine),
    note: row.note,
    caution: mine ? null : parseCaution(row.caution),
    actions: allowedActions(state, viewerId, now, limits),
    parentId: row.parent_id,
    tradeId: row.trade_id,
    tradeStatus: row.trade_status,
    tradeProgress: row.trade_progress,
    latest: row.latest,
    createdAt: iso(row.created_at)!,
    expiresAt: iso(row.expires_at)!,
    respondedAt: iso(row.responded_at),
  };
}
