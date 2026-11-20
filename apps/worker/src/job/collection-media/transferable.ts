import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { cosmoObjekt } from "@repo/db/schema";
import { Addresses, chunk } from "@repo/lib";
import { objektWriteModes } from "@repo/lib/cosmo-objekt-writes";
import { findPgError } from "@repo/lib/pg-error";
import { asc, sql } from "drizzle-orm";

import {
  confirmationOf,
  judgeTransferable,
  outcomeCounts,
  settleOutcome,
  transferableBreaker,
  type JudgedOutcome,
  type StoredOutcome,
  type TransferableMode,
  type TransferableObjekt,
  type TransferableRead,
} from "@/lib/cosmo-transferable";
import { errorCode } from "@/lib/error-code";

import { isoOf, mediaBeat, mediaLog } from "./run";

const TRANSFERABLE_READ_LIMIT = 5000;
const TRANSFERABLE_CHUNK = 500;

// read once per process: a change takes a restart, as for every worker env
const writeModes = objektWriteModes(process.env.COSMO_OBJEKT_WRITES);

let warnedUnknownModes = false;

/** Its own failure never stops the rest of the apply phase (Decision 6, Failure isolation). */
export async function applyTransferableStep() {
  if (!warnedUnknownModes && writeModes.unknown.length > 0) {
    warnedUnknownModes = true;
    mediaLog.warn(`COSMO_OBJEKT_WRITES: ignoring ${writeModes.unknown.join(", ")}`);
  }
  try {
    await applyCosmoTransferable(writeModes);
  } catch (error) {
    mediaLog.warn(`Transferable step failed; its reads stay due: ${errorCode(error)}`);
  }
}

type Judged = {
  read: TransferableRead;
  objekt: NonNullable<TransferableObjekt> | null;
  outcome: JudgedOutcome;
};

const isPlanned = (j: Judged) =>
  j.outcome === "write_untransferable" || j.outcome === "write_transferable";

/**
 * Judges the due reads against the indexer and, for each direction `mode` turns on, writes
 * Cosmo's value under every guard of Decision 6; then stores each outcome and the confirmed
 * values. Every chunk is judged before any is written, so the breaker weighs the whole run: when
 * it trips, nothing is written and the planned reads stay due. A chunk whose write waits out the
 * lock timeout is left due for the next run.
 */
async function applyCosmoTransferable(mode: TransferableMode) {
  const due = await db
    .select({
      tokenId: cosmoObjekt.tokenId,
      slug: cosmoObjekt.slug,
      transferable: cosmoObjekt.transferable,
      nonTransferableReason: cosmoObjekt.nonTransferableReason,
      usedForGrid: cosmoObjekt.usedForGrid,
      observedAt: isoOf(cosmoObjekt.observedAt),
      receivedAt: sql<string | null>`to_json(${cosmoObjekt.receivedAt}) #>> '{}'`,
      chainHeight: cosmoObjekt.chainHeight,
    })
    .from(cosmoObjekt)
    // the bare column matches cosmo_objekt_transferable_due_idx's predicate
    .where(sql`${cosmoObjekt.transferableDue}`)
    .orderBy(asc(cosmoObjekt.observedAt))
    .limit(TRANSFERABLE_READ_LIMIT);
  if (due.length === 0) return;

  const chunks: Judged[][] = [];
  await chunk(due, TRANSFERABLE_CHUNK, async (reads) => {
    const objekts = await readTransferable(reads);
    chunks.push(
      reads.map((read) => {
        const objekt = objekts.get(read.tokenId) ?? null;
        return { read, objekt, outcome: judgeTransferable(objekt, read, mode) };
      }),
    );
  });

  const planned = chunks.flat().filter(isPlanned).length;
  const breaker = transferableBreaker(planned, due.length);
  if (breaker.tripped) {
    mediaLog.warn(
      `Transferable: ${planned} writes planned over ${due.length} reads, above the limit of ${breaker.limit}; nothing written, those reads stay due`,
    );
  }

  const outcomes: StoredOutcome[] = [];
  let stored = 0;
  let changed = 0;
  let lockSkipped = 0;
  for (const judged of chunks) {
    let landed = new Set<string>();
    const writes = breaker.tripped ? [] : judged.filter(isPlanned);
    if (writes.length > 0) {
      for (const value of [false, true]) {
        const ids = writes.filter((j) => j.read.transferable === value).map((j) => j.read.tokenId);
        if (ids.length > 0) {
          mediaLog.debug(`Transferable: writing ${value} to ${ids.length} objekts`);
        }
      }
      try {
        landed = await writeTransferable(writes);
      } catch (error) {
        if (!isLockSkip(error)) throw error;
        lockSkipped += judged.length;
        continue;
      }
    }

    const settled = judged
      .filter((j) => !(breaker.tripped && isPlanned(j)))
      .map((j) =>
        Object.assign(j, { stored: settleOutcome(j.outcome, landed.has(j.read.tokenId)) }),
      );
    if (settled.length === 0) continue;
    const result = await storeOutcomes(settled);
    stored += result.stored;
    changed += result.changed;
    outcomes.push(...settled.map((s) => s.stored));
  }

  const counts = outcomeCounts(outcomes);
  const written = (counts.written_untransferable ?? 0) + (counts.written_transferable ?? 0);
  // a run that wrote nothing and changed no confirmed value stays silent; the heartbeat counts it
  if (written > 0 || changed > 0) {
    const summary = Object.entries(counts)
      .map(([name, n]) => `${name} ${n}`)
      .join(", ");
    mediaLog.info(
      `Transferable: judged ${outcomes.length} (${summary}); ${changed} confirmed values new or changed`,
    );
  } else {
    for (const [name, n] of Object.entries(counts)) mediaBeat.count(`transferable ${name}`, n);
  }
  if (stored > changed) mediaBeat.count("transferable reconfirmed", stored - changed);
  const raced = counts.raced ?? 0;
  if (lockSkipped > 0 || raced > 0) {
    mediaLog.warn(
      `Transferable: ${raced} raced, ${lockSkipped} left due on a lock timeout; the next run retries`,
    );
  }
}

/** 55P03 (lock timeout) or 40P01 (deadlock): an indexer batch held the rows; retried next run. */
function isLockSkip(error: unknown) {
  return findPgError(error, (e) => e.code === "55P03" || e.code === "40P01") !== null;
}

/** The indexer's side of each read: a token with no objekt is absent from the map. */
async function readTransferable(reads: TransferableRead[]) {
  const { rows } = await indexer.execute<{
    id: string;
    transferable: boolean;
    owner: string;
    received_at: string;
    slug: string | null;
    newer_change: boolean;
  }>(sql`
    SELECT o.id, o.transferable, o.owner, to_json(o.received_at) #>> '{}' AS received_at,
      c.slug,
      EXISTS (
        SELECT 1 FROM transferability_update u
        WHERE u.token_id = r.id AND (u.block_number > r.height OR u.applied_at IS NULL)
      ) AS newer_change
    FROM unnest(
      ${sql.param(reads.map((r) => r.tokenId))}::varchar[],
      ${sql.param(reads.map((r) => r.chainHeight))}::int[]
    ) AS r(id, height)
    JOIN objekt o ON o.id = r.id
    LEFT JOIN collection c ON c.id = o.collection_id
  `);
  return new Map(
    rows.map((r) => [
      r.id,
      {
        transferable: r.transferable,
        owner: r.owner,
        receivedAt: r.received_at,
        // no collection never equals a read's slug, so it judges as missing
        slug: r.slug ?? "",
        newerChange: r.newer_change,
      },
    ]),
  );
}

/**
 * Locks the planned rows, then writes under every guard again (Decision 6, The write), one
 * statement per direction in one transaction. Taking the locks first matters: under READ
 * COMMITTED an UPDATE that waits on a row re-checks that row but not its `NOT EXISTS` subquery,
 * which would miss a `transferability_update` the waited-on batch committed. `FOR NO KEY UPDATE`
 * leaves the indexer's foreign-key inserts on `transfer` unblocked. The owner the plan saw is
 * required too, so a read whose holder no longer matches never writes.
 */
async function writeTransferable(planned: Judged[]) {
  return indexer.transaction(async (tx) => {
    // SET LOCAL, so the timeout ends with the transaction and never leaks through pgbouncer
    await tx.execute(sql`SET LOCAL lock_timeout = '5s'`);
    await tx.execute(sql`
      SELECT id FROM objekt
      WHERE id = ANY(${sql.param(planned.map((j) => j.read.tokenId))}::varchar[])
      ORDER BY id FOR NO KEY UPDATE
    `);
    const landed = new Set<string>();
    for (const value of [false, true]) {
      const group = planned.filter(
        (j) => j.read.transferable === value && j.objekt && j.read.receivedAt !== null,
      );
      if (group.length === 0) continue;
      const { rows } = await tx.execute<{ id: string }>(sql`
        UPDATE objekt o SET transferable = ${value}
        FROM unnest(
          ${sql.param(group.map((j) => j.read.tokenId))}::varchar[],
          ${sql.param(group.map((j) => j.read.receivedAt))}::timestamptz[],
          ${sql.param(group.map((j) => j.read.chainHeight))}::int[],
          ${sql.param(group.map((j) => j.objekt!.owner))}::text[]
        ) AS r(id, received_at, height, owner)
        WHERE o.id = r.id AND o.transferable = ${!value}
          AND o.owner <> ${Addresses.SPIN} AND o.owner = r.owner
          AND o.received_at = r.received_at
          AND NOT EXISTS (
            SELECT 1 FROM transferability_update u
            WHERE u.token_id = o.id AND (u.block_number > r.height OR u.applied_at IS NULL)
          )
        RETURNING o.id
      `);
      for (const row of rows) landed.add(row.id);
    }
    return landed;
  });
}

/**
 * Stores each outcome on the read it judged (a newer read since stays due), and the confirmed
 * values, which replace a stored one only when the read is newer (Decision 6, The record's
 * invariant). Returns how many confirmed values were stored, and how many of those were new,
 * changed value or cleared a superseded mark.
 */
async function storeOutcomes(settled: (Judged & { stored: StoredOutcome })[]) {
  const confirmations = settled.flatMap((s) => {
    if (!s.objekt) return [];
    const row = confirmationOf(s.stored, s.read, s.objekt);
    return row ? [row] : [];
  });
  return db.transaction(async (tx) => {
    await tx.execute(sql`
      UPDATE cosmo_objekt co
      SET transferable_outcome = u.outcome, transferable_due = (u.outcome = 'raced'),
        transferable_checked_at = now()
      FROM unnest(
        ${sql.param(settled.map((s) => s.read.tokenId))}::varchar[],
        ${sql.param(settled.map((s) => s.read.observedAt))}::timestamptz[],
        ${sql.param(settled.map((s) => s.stored))}::text[]
      ) AS u(token_id, observed_at, outcome)
      WHERE co.token_id = u.token_id AND co.observed_at = u.observed_at
    `);
    if (confirmations.length === 0) return { stored: 0, changed: 0 };
    const { rows } = await tx.execute<{ stored: number; changed: number }>(sql`
      WITH incoming AS (
        SELECT * FROM unnest(
          ${sql.param(confirmations.map((c) => c.tokenId))}::varchar[],
          ${sql.param(confirmations.map((c) => c.transferable))}::boolean[],
          ${sql.param(confirmations.map((c) => c.observedAt))}::timestamptz[],
          ${sql.param(confirmations.map((c) => c.chainHeight))}::int[],
          ${sql.param(confirmations.map((c) => c.receivedAt))}::timestamptz[]
        ) AS c(token_id, transferable, observed_at, chain_height, received_at)
      ),
      prev AS (
        SELECT ct.token_id, ct.transferable, ct.superseded_at
        FROM cosmo_transferable ct JOIN incoming USING (token_id)
      ),
      up AS (
        INSERT INTO cosmo_transferable AS ct (token_id, transferable, observed_at, chain_height,
          received_at, confirmed_at)
        SELECT c.token_id, c.transferable, c.observed_at, c.chain_height, c.received_at, now()
        FROM incoming c
        ON CONFLICT (token_id) DO UPDATE SET
          transferable = excluded.transferable,
          observed_at = excluded.observed_at,
          chain_height = excluded.chain_height,
          received_at = excluded.received_at,
          confirmed_at = excluded.confirmed_at,
          superseded_at = NULL,
          superseded_block = NULL
        WHERE ct.observed_at < excluded.observed_at
        RETURNING ct.token_id, ct.transferable
      )
      SELECT count(*)::int AS stored,
        count(*) FILTER (WHERE p.token_id IS NULL OR p.transferable <> up.transferable
          OR p.superseded_at IS NOT NULL)::int AS changed
      FROM up LEFT JOIN prev p USING (token_id)
    `);
    return rows[0] ?? { stored: 0, changed: 0 };
  });
}
