import { db } from "@repo/db";
import { sql } from "drizzle-orm";

import { askPostsMark, notWanted } from "../../lib/offer-recipient-rules";
import {
  type ActorLimits,
  allowedActions,
  effectiveStatus,
  offerSummary,
  shownCancelReason,
  topupPayer,
} from "../../lib/offer-rules";
import { iso } from "../../lib/time";
import { unique } from "../../lib/unique";
import { type CardRef, parseCaution } from "../../schemas/chat";
import type {
  OfferCancelReason,
  OfferStatus,
  OfferView,
  ShownSerial,
  TradeStatus,
} from "../../schemas/offer";
import { boundOfferListSql } from "../trade/lists";

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
  post_list_id: number | null;
  post_slug: string | null;
  post_name: string | null;
  /** the recipient's Only offers with what I want is off and they have a want list on Trade */
  rule_suggestable: boolean;
  /** recipient only, an offer on no post: the posts its asks were stored against, in ask order */
  ask_posts: { slug: string; name: string }[] | null;
  /** the recipient takes asks across posts and has two or more posts on Trade */
  rule_one_post_suggestable: boolean;
  items: [
    side: "give" | "get",
    slug: string,
    objektId: string | null,
    listSlug: string | null,
    sentAt: string | null,
    /** give: on one of the recipient's want lists, on Trade or not */
    wanted: boolean,
    /** give: the recipient asked for it in the offer this one counters */
    asked: boolean,
  ][];
};

/**
 * Offers with their items, trade and whether a newer offer exists, in one read. The want-list
 * checks behind the recipient's labels and nudge run only for offers sent to `reader`: only the
 * recipient sees them, and they cost a lookup per give.
 */
export async function fetchOffers(
  offerIds: number[],
  reader: string | null,
): Promise<Map<number, HydratedOffer>> {
  if (offerIds.length === 0) return new Map();
  const forReader = reader === null ? sql`false` : sql`o.to_user_id = ${reader}`;
  // a CASE, not an AND: Postgres may evaluate both sides of an AND, and most offers are on a post
  const acrossPosts = sql`${forReader} AND o.post_list_id IS NULL`;
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
      o.post_list_id, pl.slug AS post_slug, pl.name AS post_name,
      (${forReader} AND NOT ru.only_wanted_offers AND EXISTS (
        SELECT 1 FROM lists wl
        WHERE wl.user_id = o.to_user_id AND wl.list_type = 'want' AND wl.discoverable
      )) AS rule_suggestable,
      CASE WHEN ${acrossPosts} THEN (
        SELECT json_agg(json_build_object('slug', g.slug, 'name', g.name) ORDER BY g.first_item)
        FROM (
          SELECT al.slug, al.name, min(ai.id) AS first_item
          FROM offer_item ai JOIN lists al ON al.id = ai.list_id
          WHERE ai.offer_id = o.id AND ai.side = 'get'
            -- an objekt the recipient offered in the countered offer keeps its own list
            AND NOT EXISTS (
              SELECT 1 FROM offer p JOIN offer_item pg ON pg.offer_id = p.id AND pg.side = 'give'
              WHERE p.id = o.parent_id AND p.from_user_id = o.to_user_id
                AND pg.objekt_id = ai.objekt_id
            )
          GROUP BY al.id
        ) g
      ) END AS ask_posts,
      coalesce(CASE WHEN ${acrossPosts} THEN ru.multi_post_asks AND (
        SELECT count(*) FROM (
          SELECT 1 FROM lists tl
          WHERE tl.user_id = o.to_user_id AND ${boundOfferListSql("tl")} AND tl.discoverable
          LIMIT 2
        ) two
      ) >= 2 END, false) AS rule_one_post_suggestable,
      coalesce((
        SELECT json_agg(
          json_build_array(
            i.side, i.collection_slug, i.objekt_id, l.slug, i.sent_at::text,
            ${forReader} AND i.side = 'give' AND EXISTS (
              SELECT 1 FROM list_entries we JOIN lists wl ON wl.id = we.list_id
              WHERE wl.user_id = o.to_user_id AND wl.list_type = 'want'
                AND we.collection_slug = i.collection_slug
            ),
            ${forReader} AND i.side = 'give' AND EXISTS (
              SELECT 1 FROM offer p JOIN offer_item pi ON pi.offer_id = p.id AND pi.side = 'get'
              WHERE p.id = o.parent_id AND p.from_user_id = o.to_user_id
                AND (pi.objekt_id = i.objekt_id
                  OR (pi.objekt_id IS NULL AND pi.collection_slug = i.collection_slug))
            )
          )
          ORDER BY i.id
        )
        FROM offer_item i LEFT JOIN lists l ON l.id = i.list_id
        WHERE i.offer_id = o.id
      ), '[]') AS items
    FROM offer o
    LEFT JOIN trade t ON t.offer_id = o.id
    LEFT JOIN lists pl ON pl.id = o.post_list_id
    JOIN "user" ru ON ru.id = o.to_user_id
    WHERE o.id = ANY(${sql.param(unique(offerIds))}::int[])
  `);
  return new Map(result.rows.map((row) => [row.id, row]));
}

/** Each item as a card, so `hydrateCards` reads serials and collections with the thread's own cards. */
export function offerItemCards(offers: Iterable<HydratedOffer>): CardRef[] {
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

/** The decline nudge's condition, read for the recipient only. */
function suggestsWantedOnly(row: HydratedOffer) {
  return (
    row.rule_suggestable &&
    row.items.some(([side, , , , , wanted, asked]) => side === "give" && !wanted && !asked)
  );
}

export function itemViews(
  row: HydratedOffer,
  viewerId: string,
  serialOf: (id: string) => ShownSerial,
) {
  const viewerIsRecipient = row.to_user_id === viewerId;
  const items = row.items.map(
    ([side, collectionSlug, objektId, listSlug, sentAt, wanted, asked]) => {
      const { serial, estimated } =
        objektId === null ? { serial: null, estimated: false } : serialOf(objektId);
      return {
        side,
        view: {
          collectionSlug,
          objektId,
          serial,
          serialEstimated: estimated,
          listSlug,
          sentAt: iso(sentAt),
          notWanted: notWanted({ side, viewerIsRecipient, wanted, asked }),
        },
      };
    },
  );
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
    cancelReason: shownCancelReason(row.cancel_reason),
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
    post: row.post_slug && row.post_name ? { slug: row.post_slug, name: row.post_name } : null,
    ...(row.to_user_id === viewerId && { suggestWantedOnly: suggestsWantedOnly(row) }),
    ...askPostsMark({
      viewerIsRecipient: row.to_user_id === viewerId,
      posts: row.ask_posts ?? [],
      suggestable: row.rule_one_post_suggestable,
    }),
    createdAt: iso(row.created_at)!,
    expiresAt: iso(row.expires_at)!,
    respondedAt: iso(row.responded_at),
  };
}
