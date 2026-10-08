import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections, objekts, transfers } from "@repo/db/indexer/schema";
import { trade, tradeLeg, tradeSubstitute } from "@repo/db/schema";
import { isSerialEstimated, shownSerial } from "@repo/lib/serial";
import { and, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";

import {
  copyWindowStart,
  type LegResult,
  type MatchLeg,
  type MatchTransfer,
  matchLegs,
  nearMisses,
  tradeOutcome,
  transferKey,
} from "../lib/trade-match";
import { unique } from "../lib/unique";
import { HELD_COPY_STATUSES, type TradePayload } from "../schemas/offer";
import type { Tx } from "./offer/core";
import { writeNotes } from "./offer/notes";

export type LegRow = {
  id: number;
  trade_id: number;
  offer_id: number;
  conversation_id: number;
  user_a: string;
  user_b: string;
  from_user_id: string;
  to_user_id: string;
  from_addresses: string[];
  to_addresses: string[];
  from_current: string[];
  to_current: string[];
  collection_slug: string;
  objekt_id: string | null;
  window_start: string;
  accepted_at: string;
};

/**
 * The open legs of in-progress trades, or of the ones these users give in, with both sides'
 * current addresses. A transfer can only verify a leg its sender gives, so the legs the
 * givers give hold every leg that competes for their transfers.
 */
export async function loadOpenLegs(giverIds?: string[]): Promise<LegRow[]> {
  const result = await db.execute<LegRow>(sql`
    SELECT l.id, l.trade_id, t.offer_id, o.conversation_id, t.user_a, t.user_b,
      l.from_user_id, l.to_user_id, l.from_addresses, l.to_addresses,
      ARRAY(SELECT lower(a.address) FROM user_address a WHERE a.user_id = l.from_user_id) AS from_current,
      ARRAY(SELECT lower(a.address) FROM user_address a WHERE a.user_id = l.to_user_id) AS to_current,
      l.collection_slug, l.objekt_id, o.created_at::text AS window_start,
      t.accepted_at::text AS accepted_at
    FROM trade_leg l
    JOIN trade t ON t.id = l.trade_id
    JOIN offer o ON o.id = t.offer_id
    WHERE l.open AND t.status = 'in_progress'
      ${giverIds === undefined ? sql`` : sql`AND l.from_user_id = ANY(${sql.param(giverIds)}::text[])`}
  `);
  return result.rows;
}

const addressSet = (snapshot: string[], current: string[]) =>
  new Set([...snapshot, ...current].map((address) => address.toLowerCase()));

/**
 * Every open leg is matched in one pass, so a transfer is spent on one leg across trades.
 * Copies are read for every leg's collection: any-copy legs take them, and a specific leg
 * reports the wrong ones.
 */
export async function matchOpenLegs(legs: LegRow[]) {
  const collectionRows =
    legs.length === 0
      ? []
      : await indexer
          .select({ id: collections.id, slug: collections.slug })
          .from(collections)
          .where(inArray(collections.slug, unique(legs.map((leg) => leg.collection_slug))));
  const uuidOf = new Map(collectionRows.map((row) => [row.slug, row.id]));

  const matchLegsInput: MatchLeg[] = legs.map((leg) => ({
    id: leg.id,
    objektId: leg.objekt_id,
    collectionId: uuidOf.get(leg.collection_slug) ?? null,
    windowStart: leg.window_start,
    copyWindowStart: copyWindowStart(leg.accepted_at),
    acceptedAt: leg.accepted_at,
    giver: addressSet(leg.from_addresses, leg.from_current),
    receiver: addressSet(leg.to_addresses, leg.to_current),
  }));
  const since = new Date(
    Math.min(...legs.map((leg) => new Date(leg.window_start).getTime())),
  ).toISOString();

  const specificIds = unique(legs.flatMap((leg) => (leg.objekt_id ? [leg.objekt_id] : [])));
  const copyUuids = unique(legs.flatMap((leg) => uuidOf.get(leg.collection_slug) ?? []));
  const givers = unique(
    legs.flatMap((leg) => Array.from(addressSet(leg.from_addresses, leg.from_current))),
  );
  const columns = {
    id: transfers.id,
    from: transfers.from,
    to: transfers.to,
    timestamp: transfers.timestamp,
    hash: transfers.hash,
    tokenId: transfers.tokenId,
    objektId: transfers.objektId,
    collectionId: transfers.collectionId,
  };
  const [specific, copies] = await Promise.all([
    specificIds.length === 0
      ? []
      : indexer
          .select(columns)
          .from(transfers)
          .where(and(inArray(transfers.objektId, specificIds), gte(transfers.timestamp, since))),
    copyUuids.length === 0 || givers.length === 0
      ? []
      : indexer
          .select(columns)
          .from(transfers)
          .where(
            and(
              inArray(transfers.collectionId, copyUuids),
              inArray(transfers.from, givers),
              gte(transfers.timestamp, since),
            ),
          ),
  ]);
  // a specific leg's own token is in both reads
  const candidates: MatchTransfer[] = [
    ...new Map([...specific, ...copies].map((t) => [t.id, t])).values(),
  ];
  const usedRows =
    candidates.length === 0
      ? []
      : await db
          .select({ hash: tradeLeg.txHash, tokenId: tradeLeg.verifiedObjektId })
          .from(tradeLeg)
          .where(
            and(
              inArray(tradeLeg.txHash, unique(candidates.map((t) => t.hash))),
              isNotNull(tradeLeg.verifiedObjektId),
            ),
          );
  const used = new Set(
    usedRows.flatMap((row) =>
      row.hash && row.tokenId ? [transferKey({ hash: row.hash, tokenId: row.tokenId })] : [],
    ),
  );
  const matched = matchLegs(matchLegsInput, candidates, used);
  return {
    results: matched.results,
    nearMisses: nearMisses(matchLegsInput, candidates, matched),
  };
}

export type SettledTrade = {
  tradeId: number;
  offerId: number;
  conversationId: number;
  userA: string;
  userB: string;
};

/**
 * Under the trade's row lock, after this run's legs are recorded: ends the trade when the
 * results decide it, and notes a verified leg or the end to both parties. `applied` holds
 * every open leg's result as recorded, `verified` the ones recorded now. The verifier and an
 * accepted wrong copy both end a trade here, so it ends the same way from either.
 */
export async function finishSettle(
  tx: Tx,
  settled: SettledTrade,
  applied: LegResult[],
  counts: { alreadyVerified: number; verified: number; total: number },
  name: (userId: string) => { userId: string; name: string },
) {
  const { tradeId, userA, userB } = settled;
  const held = applied.some((r) => r.kind === "broken") ? await heldCopies(tx, tradeId) : 0;
  const outcome = tradeOutcome(applied, counts.alreadyVerified, held);
  const ended = outcome.status !== "in_progress";
  if (ended) {
    await tx
      .update(trade)
      .set({
        status: outcome.status,
        endedAt: sql`now()`,
        cancelReason: outcome.status === "cancelled" ? outcome.reason : null,
      })
      .where(eq(trade.id, tradeId));
    await tx
      .update(tradeLeg)
      .set({ open: false })
      .where(and(eq(tradeLeg.tradeId, tradeId), eq(tradeLeg.open, true)));
  }
  if (counts.verified === 0 && !ended) return { ended, notified: [], reputations: [] };

  const event: TradePayload["event"] = ended ? outcome.status : "leg_verified";
  const progress = { verified: counts.alreadyVerified + counts.verified, total: counts.total };
  const notified = await writeNotes(
    tx,
    [userA, userB].map((userId) => ({
      type: "trade" as const,
      userId,
      payload: {
        tradeId,
        offerId: settled.offerId,
        conversationId: settled.conversationId,
        event,
        reason: outcome.status === "cancelled" ? outcome.reason : null,
        progress,
        partner: name(userId === userA ? userB : userA),
      },
    })),
  );
  return {
    ended,
    notified,
    // a completed trade changes both parties' cached reputation
    reputations: outcome.status === "completed" ? [userA, userB] : [],
  };
}

/** A wrong copy's note: `wrong_copy` goes to both parties, `wrong_copy_declined` to the giver. */
export function wrongCopyNote(
  settled: SettledTrade,
  event: "wrong_copy" | "wrong_copy_declined",
  to: { userId: string; partner: { userId: string; name: string } },
  progress: { verified: number; total: number },
  copy: NonNullable<TradePayload["copy"]>,
) {
  return {
    type: "trade" as const,
    userId: to.userId,
    payload: {
      tradeId: settled.tradeId,
      offerId: settled.offerId,
      conversationId: settled.conversationId,
      event,
      reason: null,
      progress,
      partner: to.partner,
      copy,
    },
  };
}

/** Serials as the trade page shows them, for a wrong copy's notes. */
export async function shownSerials(ids: string[]) {
  const rows =
    ids.length === 0
      ? []
      : await indexer
          .select({ id: objekts.id, serial: objekts.serial, mintedAt: objekts.mintedAt })
          .from(objekts)
          .where(inArray(objekts.id, unique(ids)));
  const byId = new Map(
    rows.map((row) => [
      row.id,
      { serial: shownSerial(row.serial), estimated: isSerialEstimated(row.mintedAt) },
    ]),
  );
  return (id: string) => byId.get(id) ?? { serial: null, estimated: false };
}

/** A wrong copy still before its receiver: pending or declined, and not spent verifying a leg elsewhere. */
export const heldCopyWhere = and(
  inArray(tradeSubstitute.status, [...HELD_COPY_STATUSES]),
  sql`NOT EXISTS (
    SELECT 1 FROM trade_leg v
    WHERE v.tx_hash = ${tradeSubstitute.txHash} AND v.verified_objekt_id = ${tradeSubstitute.objektId}
  )`,
);

/** Wrong copies the receiver got and hasn't accepted: a transfer was made. */
export async function heldCopies(q: Tx | typeof db, tradeId: number) {
  const [row] = await q
    .select({ count: sql<number>`count(*)::int` })
    .from(tradeSubstitute)
    .innerJoin(tradeLeg, eq(tradeLeg.id, tradeSubstitute.tradeLegId))
    .where(and(eq(tradeLeg.tradeId, tradeId), heldCopyWhere));
  return row?.count ?? 0;
}
