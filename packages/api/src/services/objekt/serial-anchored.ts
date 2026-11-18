import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { cosmoObjekt } from "@repo/db/schema";
import { chunkMap } from "@repo/lib";
import { objektWriteModes } from "@repo/lib/cosmo-objekt-writes";
import { V1_CUTOFF_MS } from "@repo/lib/serial";
import { and, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";

import { exactByOwnRead, type PinCandidate, pinnedByConfirmed } from "../../lib/confirmed-pins";
import { unique } from "../../lib/unique";

const ANCHORED_BATCH = 500;

/**
 * The post-cutoff objekts whose reserved range also holds a serial Cosmo
 * supplied, a manual anchor or, with `COSMO_OBJEKT_WRITES` holding `anchors`,
 * a serial a connected account's Cosmo read confirmed; and, with `online-anchors`,
 * the online objekts whose own serial a read confirmed. Reads anchoring the way
 * the worker's `computeOfflineSerials` and `mergeAnchors` pin a range, so the
 * three must change together.
 */
export async function anchoredSerialIds(ids: string[]): Promise<Set<string>> {
  // process.env, not serverEnv: the worker bundles this module through offer/verify, and importing
  // env.ts there kills it on start (apps/worker/AGENTS.md)
  const modes = objektWriteModes(process.env.COSMO_OBJEKT_WRITES);
  const asked = unique(ids);
  const [ranged, ownRead] = await Promise.all([
    rangeAnchoredIds(asked, modes.anchors),
    modes.onlineAnchors ? onlineReadIds(asked) : [],
  ]);
  for (const id of ownRead) ranged.add(id);
  return ranged;
}

/**
 * The online post-cutoff objekts whose own serial a connected account's read confirmed, shown as
 * read (`exactByOwnRead`). The indexer read runs only when an asked id has a read.
 */
async function onlineReadIds(ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  try {
    const reads = await chunkMap(ids, ANCHORED_BATCH, (batch) =>
      db
        .select({ tokenId: cosmoObjekt.tokenId, objektNo: cosmoObjekt.objektNo })
        .from(cosmoObjekt)
        .where(and(inArray(cosmoObjekt.tokenId, batch), sql`${cosmoObjekt.serialEligible}`)),
    );
    if (reads.length === 0) return [];
    const cutoff = new Date(V1_CUTOFF_MS).toISOString();
    const rows = await chunkMap(
      reads.map((r) => r.tokenId),
      ANCHORED_BATCH,
      (batch) =>
        indexer
          .select({
            id: objekts.id,
            serial: objekts.serial,
            postCutoff: sql<boolean>`${objekts.mintedAt} >= ${cutoff}`,
            // pre-assigned online collections have batches and number like offline ones
            online: sql<boolean>`${collections.onOffline} = 'online' and ${collections.serialBatches} is null`,
          })
          .from(objekts)
          .innerJoin(collections, eq(collections.id, objekts.collectionId))
          .where(inArray(objekts.id, batch)),
    );
    return exactByOwnRead(reads, rows);
  } catch (error) {
    // the serial then reads as estimated, the safe error
    const code = (error as { code?: string }).code ?? "unknown";
    console.warn(`[serial-anchored] online reads not read (${code})`);
    return [];
  }
}

/**
 * The post-cutoff objekts whose reserved range holds a v1 serial, a manual anchor or, with
 * `withConfirmed`, an agreeing confirmed serial.
 */
async function rangeAnchoredIds(ids: string[], withConfirmed: boolean): Promise<Set<string>> {
  const cutoff = new Date(V1_CUTOFF_MS).toISOString();

  const holdingBatch = (column: "start" | "end") => sql<
    string | null
  >`(select b->>${sql.raw(`'${column}'`)} from jsonb_array_elements(${collections.serialBatches}) b
      where ${objekts.id}::bigint between (b->>'start')::bigint and (b->>'end')::bigint
      limit 1)`;

  const anchored = sql<boolean>`exists (
    select 1 from jsonb_array_elements(${collections.serialBatches}) b
    where ${objekts.id}::bigint between (b->>'start')::bigint and (b->>'end')::bigint
      and (
        exists (
          select 1 from ${objekts} a
          where a.collection_id = ${collections.id} and a.serial > 0
            and a.minted_at < ${cutoff}
            and a.id::bigint between (b->>'start')::bigint and (b->>'end')::bigint)
        or exists (
          select 1 from jsonb_array_elements(coalesce(${collections.serialAnchors}, '[]'::jsonb)) m
          where (m->>'tokenId')::bigint
            between (b->>'start')::bigint and (b->>'end')::bigint)))`;

  if (!withConfirmed) {
    const rows = await chunkMap(ids, ANCHORED_BATCH, (batch) =>
      indexer
        .select({ id: objekts.id })
        .from(objekts)
        .innerJoin(collections, eq(collections.id, objekts.collectionId))
        .where(
          and(
            inArray(objekts.id, batch),
            gte(objekts.mintedAt, cutoff),
            isNotNull(collections.serialBatches),
            anchored,
          ),
        ),
    );
    return new Set(rows.map((row) => row.id));
  }

  // every post-cutoff id with a stored batch, so the ones not yet anchored can be tried against
  // the confirmed serials
  const rows = await chunkMap(ids, ANCHORED_BATCH, (batch) =>
    indexer
      .select({
        id: objekts.id,
        slug: collections.slug,
        start: holdingBatch("start"),
        end: holdingBatch("end"),
        anchored,
      })
      .from(objekts)
      .innerJoin(collections, eq(collections.id, objekts.collectionId))
      .where(
        and(
          inArray(objekts.id, batch),
          gte(objekts.mintedAt, cutoff),
          isNotNull(collections.serialBatches),
        ),
      ),
  );

  const result = new Set(rows.filter((row) => row.anchored).map((row) => row.id));

  const candidates: PinCandidate[] = rows.flatMap((row) =>
    !row.anchored && row.start !== null && row.end !== null
      ? [{ id: row.id, slug: row.slug, start: Number(row.start), end: Number(row.end) }]
      : [],
  );
  if (candidates.length === 0) return result;

  try {
    // a pin needs a row the serial job has already rewritten with (serial_due off), so "~" goes
    // when the serials move and not before; due rows still count for agreement, as in the job
    const rows = await db
      .select({
        slug: cosmoObjekt.slug,
        tokenId: cosmoObjekt.tokenId,
        objektNo: cosmoObjekt.objektNo,
        serialDue: cosmoObjekt.serialDue,
      })
      .from(cosmoObjekt)
      .where(
        and(
          sql`${cosmoObjekt.serialEligible}`,
          inArray(cosmoObjekt.slug, unique(candidates.map((c) => c.slug))),
        ),
      );
    const confirmed = rows.map(({ serialDue, ...r }) => ({ ...r, settled: !serialDue }));
    for (const id of pinnedByConfirmed(candidates, confirmed)) result.add(id);
  } catch (error) {
    // the serial then reads as estimated, the safe error
    const code = (error as { code?: string }).code ?? "unknown";
    console.warn(`[serial-anchored] confirmed serials not read (${code})`);
  }
  return result;
}
