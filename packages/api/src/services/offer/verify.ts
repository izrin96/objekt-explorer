import { db } from "@repo/db";
import type { Tx } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections, objekts, transfers } from "@repo/db/indexer/schema";
import { trade, tradeLeg, tradeSubstitute } from "@repo/db/schema";
import { chunkMap } from "@repo/lib";
import { findPgError } from "@repo/lib/pg-error";
import { isSerialEstimated, shownSerial } from "@repo/lib/serial";
import { and, eq, gte, inArray, isNotNull, or, sql } from "drizzle-orm";

import {
  addressSet,
  copyReads,
  copyWindowStart,
  giversOf,
  type LegResult,
  type LegRow,
  type MatchLeg,
  type MatchTransfer,
  matchLegs,
  nearMisses,
  type SettledTrade,
  transferKey,
} from "../../lib/trade-match";
import { wrongCopyNote } from "../../lib/trade-notes";
import { needsHeld, settleNotes, settlePlan } from "../../lib/trade-settle";
import { unique } from "../../lib/unique";
import { HELD_COPY_STATUSES } from "../../schemas/offer";
import { removeReceived } from "../list/received";
import { anchoredSerialIds } from "../objekt/serial-anchored";
import { writeNotes } from "./notes";

export { wrongCopyNote };
export type { LegRow, SettledTrade };

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
      l.collection_slug, l.objekt_id, l.untransferable_at::text AS untransferable_at,
      l.away_at::text AS away_at,
      o.created_at::text AS window_start,
      t.accepted_at::text AS accepted_at
    FROM trade_leg l
    JOIN trade t ON t.id = l.trade_id
    JOIN offer o ON o.id = t.offer_id
    WHERE l.open AND t.status = 'in_progress'
      ${giverIds === undefined ? sql`` : sql`AND l.from_user_id = ANY(${sql.param(giverIds)}::text[])`}
  `);
  return result.rows;
}

const COPY_READ_BATCH = 100;

/**
 * Every open leg is matched in one pass, so a transfer is spent on one leg across trades.
 * Copies are read for every leg's collection: any-copy legs take them, and a specific leg
 * reports the wrong ones. `seenUntil` is how far the indexer has read, for the away grace.
 */
export async function matchOpenLegs(legs: LegRow[], seenUntil: string | null) {
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
    giver: giversOf(leg),
    receiver: addressSet(leg.to_addresses, leg.to_current),
  }));
  const specificLegs = matchLegsInput.filter((leg) => leg.objektId !== null);
  const specificIds = unique(specificLegs.map((leg) => leg.objektId!));
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
          .where(
            and(
              inArray(transfers.objektId, specificIds),
              gte(
                transfers.timestamp,
                new Date(
                  Math.min(...specificLegs.map((leg) => Date.parse(leg.windowStart))),
                ).toISOString(),
              ),
            ),
          ),
    chunkMap(copyReads(matchLegsInput), COPY_READ_BATCH, (reads) =>
      indexer
        .select(columns)
        .from(transfers)
        .where(
          or(
            ...reads.map((read) =>
              and(
                eq(transfers.collectionId, read.collectionId),
                inArray(transfers.from, read.givers),
                gte(transfers.timestamp, read.since),
              ),
            ),
          ),
        ),
    ),
  ]);
  // a specific leg's own token is in both reads
  const candidates: MatchTransfer[] = [
    ...new Map([...specific, ...copies].map((t) => [t.id, t])).values(),
  ];
  const used = await usedTransfers(
    db,
    candidates.map((t) => t.hash),
  );
  const matched = matchLegs(matchLegsInput, candidates, { used, seenUntil });
  return {
    results: matched.results,
    nearMisses: nearMisses(matchLegsInput, candidates, matched),
  };
}

/** The `transferKey`s among these transaction hashes that already verified a leg. */
export async function usedTransfers(q: Tx | typeof db, hashes: string[]) {
  const rows =
    hashes.length === 0
      ? []
      : await q
          .select({ hash: tradeLeg.txHash, tokenId: tradeLeg.verifiedObjektId })
          .from(tradeLeg)
          .where(
            and(inArray(tradeLeg.txHash, unique(hashes)), isNotNull(tradeLeg.verifiedObjektId)),
          );
  return new Set(
    rows.flatMap((row) =>
      row.hash && row.tokenId ? [transferKey({ hash: row.hash, tokenId: row.tokenId })] : [],
    ),
  );
}

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
  /** `autoAccepted`: how many of `verified` were wrong copies accepted automatically */
  counts: { alreadyVerified: number; verified: number; total: number; autoAccepted?: number },
  name: (userId: string) => { userId: string; name: string },
  /** false when the caller writes its own note for a leg that closed without ending the trade */
  { noteLegs = true }: { noteLegs?: boolean } = {},
) {
  const { tradeId, userA, userB } = settled;
  const held = needsHeld(applied) ? await heldCopies(tx, tradeId) : 0;
  const plan = settlePlan(applied, counts, held, noteLegs);
  if (plan.ended) {
    await tx
      .update(trade)
      .set({
        status: plan.status,
        endedAt: sql`now()`,
        cancelReason: plan.cancelReason,
      })
      .where(eq(trade.id, tradeId));
    await tx
      .update(tradeLeg)
      .set({ open: false })
      .where(and(eq(tradeLeg.tradeId, tradeId), eq(tradeLeg.open, true)));
  }
  if (plan.note === null) return { ended: plan.ended, notified: [], reputations: [] };

  const confirmed =
    plan.status === "completed" &&
    (
      await tx
        .select({ id: tradeLeg.id })
        .from(tradeLeg)
        .where(and(eq(tradeLeg.tradeId, tradeId), isNotNull(tradeLeg.confirmedAt)))
        .limit(1)
    ).length > 0;
  const notified = await writeNotes(tx, settleNotes(settled, plan, name, confirmed));
  return {
    ended: plan.ended,
    notified,
    reputations: plan.changesReputation ? [userA, userB] : [],
  };
}

/** Another leg already verified with this transfer. */
const transferTaken = (error: unknown) =>
  findPgError(error, (e) => e.code === "23505" && e.constraint === "trade_leg_transfer_uniq") !==
  null;

export type AcceptedCopy = {
  id: number;
  legId: number;
  txHash: string;
  objektId: string;
  transferredAt: string;
};

/**
 * Under the trade's row lock, on a copy the caller found pending on an open leg: verifies the
 * leg with the copy's transfer as the verifier records a leg, and marks the copy accepted. The
 * receiver's Accept and the worker's deadline, expiry and break all accept here. Null when
 * another leg already took the transfer (the unique index refuses it); nothing is written then.
 */
export async function acceptCopy(
  tx: Tx,
  copy: AcceptedCopy,
  { auto }: { auto: boolean },
): Promise<LegResult | null> {
  const recorded = await tx
    .transaction(async (savepoint) => {
      await savepoint
        .update(tradeLeg)
        .set({
          open: false,
          verifiedAt: copy.transferredAt,
          txHash: copy.txHash,
          verifiedObjektId: copy.objektId,
        })
        .where(eq(tradeLeg.id, copy.legId));
      return true;
    })
    .catch((error: unknown) => {
      if (transferTaken(error)) return false;
      throw error;
    });
  if (!recorded) return null;
  await removeReceived(tx, [copy.legId]);
  await tx
    .update(tradeSubstitute)
    .set({ status: "accepted", decidedAt: sql`now()`, autoAccepted: auto })
    .where(eq(tradeSubstitute.id, copy.id));
  return {
    kind: "verified",
    transferId: "",
    txHash: copy.txHash,
    objektId: copy.objektId,
    at: copy.transferredAt,
  };
}

/** The held copies on these legs whose transfer verified no leg, earliest first. */
export async function legCopies(tx: Tx, legIds: number[]) {
  if (legIds.length === 0) return [];
  return tx
    .select({
      id: tradeSubstitute.id,
      legId: tradeSubstitute.tradeLegId,
      txHash: tradeSubstitute.txHash,
      objektId: tradeSubstitute.objektId,
      transferredAt: tradeSubstitute.transferredAt,
      at: tradeSubstitute.transferredAt,
      status: tradeSubstitute.status,
      acceptBy: tradeSubstitute.acceptBy,
      remindedAt: tradeSubstitute.remindedAt,
    })
    .from(tradeSubstitute)
    .where(and(inArray(tradeSubstitute.tradeLegId, legIds), heldCopyWhere))
    .orderBy(tradeSubstitute.transferredAt, tradeSubstitute.id);
}

const TRANSFERABLE_BATCH = 500;

/** Whether the indexer reads each objekt as transferable; an unknown id is left out. */
export async function readTransferable(ids: string[]) {
  const rows = await chunkMap(unique(ids), TRANSFERABLE_BATCH, (batch) =>
    indexer
      .select({ id: objekts.id, transferable: objekts.transferable })
      .from(objekts)
      .where(inArray(objekts.id, batch)),
  );
  return new Map(rows.map((row) => [row.id, row.transferable]));
}

/** Serials as the trade page shows them, for a wrong copy's notes. */
export async function shownSerials(ids: string[]) {
  const [rows, anchored] = await Promise.all([
    ids.length === 0
      ? []
      : indexer
          .select({ id: objekts.id, serial: objekts.serial, mintedAt: objekts.mintedAt })
          .from(objekts)
          .where(inArray(objekts.id, unique(ids))),
    anchoredSerialIds(ids),
  ]);
  const byId = new Map(
    rows.map((row) => [
      row.id,
      {
        serial: shownSerial(row.serial),
        estimated: isSerialEstimated(row.mintedAt, anchored.has(row.id)),
      },
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

/** The legs of these trades verified through a wrong copy accepted automatically. */
export async function autoAcceptedLegs(tradeIds: number[]) {
  if (tradeIds.length === 0) return new Set<number>();
  const rows = await db
    .select({ legId: tradeSubstitute.tradeLegId })
    .from(tradeSubstitute)
    .innerJoin(tradeLeg, eq(tradeLeg.id, tradeSubstitute.tradeLegId))
    .where(
      and(
        inArray(tradeLeg.tradeId, tradeIds),
        eq(tradeSubstitute.status, "accepted"),
        eq(tradeSubstitute.autoAccepted, true),
      ),
    );
  return new Set(rows.map((row) => row.legId));
}
