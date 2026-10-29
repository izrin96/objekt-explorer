import { enrichUpdateMetadata } from "@repo/cosmo/server/metadata";
import type { CosmoObjektMetadataV1 } from "@repo/cosmo/types/metadata";
import { indexer } from "@repo/db/indexer";
import {
  collections,
  listEventOutbox,
  objekts,
  pendingTransfers,
  transferabilityUpdates,
  transfers,
} from "@repo/db/indexer/schema";
import { addr, chunk, slugifyObjekt } from "@repo/lib";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { log } from "@/lib/log";
import { safeFetchMetadataV3 } from "@/lib/metadata-utils";
import { planReplay } from "@/lib/pending-replay";

const BATCH_SIZE = 50;
const replayLog = log("fix-collection");

type Tx = Parameters<Parameters<typeof indexer.transaction>[0]>[0];

const finalHeight = sql`(select max(height) from squid_processor.status)`;

/**
 * Replays the transfers the indexer held because Cosmo had no metadata for their token. A token
 * replays only once every held row is final: this write would survive a reorg that undoes them.
 */
export async function replayPendingTransfers() {
  const ready = await indexer.execute<{ token_id: string }>(sql`
    select token_id from ${pendingTransfers}
    group by token_id
    having max(block_number) <= ${finalHeight}
  `);
  const tokenIds = ready.rows.map((row) => row.token_id);
  replayLog.debug(`${tokenIds.length} held tokens to replay`);

  let replayed = 0;
  let unresolved = 0;
  let failed = 0;
  await chunk(tokenIds, BATCH_SIZE, async (batch) => {
    const fetched = await Promise.all(
      batch.map(async (tokenId) => ({ tokenId, metadata: await safeFetchMetadataV3(tokenId) })),
    );

    for (const { tokenId, metadata } of fetched) {
      if (!metadata) {
        unresolved++;
        continue;
      }
      try {
        if (await indexer.transaction((tx) => replayToken(tx, tokenId, metadata))) replayed++;
      } catch (error) {
        failed++;
        replayLog.debug(`Replay of token ${tokenId} failed:`, error);
      }
    }
  });

  const leftover = await applyLeftoverTransferability();

  if (replayed > 0) replayLog.info(`Replayed the held transfers of ${replayed} tokens`);
  if (leftover > 0) replayLog.info(`Settled ${leftover} leftover transferability changes`);
  if (unresolved > 0)
    replayLog.warn(`Cosmo returned no metadata for ${unresolved} held tokens; they retry next run`);
  if (failed > 0) replayLog.warn(`Replay failed for ${failed} held tokens; they retry next run`);
}

/**
 * Applies a final transferability change the indexer left unapplied although its objekt exists,
 * such as one read while a replay of that token was committing. A change older than one already
 * applied is only stamped, so the objekt never goes back to an earlier state. A token with any
 * change still in a hot block waits: a reorg would not undo this write.
 */
async function applyLeftoverTransferability() {
  const result = await indexer.execute(sql`
    with pending as (
      select u.id, u.token_id, u.transferable, u.block_number, u.transaction_index
      from ${transferabilityUpdates} u
      join ${objekts} o on o.id = u.token_id
      where u.applied_at is null
        and not exists (
          select 1 from ${transferabilityUpdates} h
          where h.token_id = u.token_id and h.block_number > ${finalHeight}
        )
    ),
    latest as (
      select distinct on (p.token_id) p.token_id, p.transferable
      from pending p
      where not exists (
        select 1 from ${transferabilityUpdates} n
        where n.token_id = p.token_id
          and n.applied_at is not null
          and (n.block_number, n.transaction_index) > (p.block_number, p.transaction_index)
      )
      order by p.token_id, p.block_number desc, p.transaction_index desc
    ),
    applied as (
      update ${objekts} o set transferable = latest.transferable
      from latest
      where o.id = latest.token_id
    )
    update ${transferabilityUpdates} u set applied_at = now()
    from pending
    where u.id = pending.id
  `);
  return result.rowCount ?? 0;
}

async function replayToken(tx: Tx, tokenId: string, metadata: CosmoObjektMetadataV1) {
  const rows = await tx
    .select({
      id: pendingTransfers.id,
      tokenId: pendingTransfers.tokenId,
      from: pendingTransfers.from,
      to: pendingTransfers.to,
      timestamp: pendingTransfers.timestamp,
      hash: pendingTransfers.hash,
      blockNumber: pendingTransfers.blockNumber,
      logIndex: pendingTransfers.logIndex,
      final: sql<boolean>`${pendingTransfers.blockNumber} <= ${finalHeight}`,
    })
    .from(pendingTransfers)
    .where(eq(pendingTransfers.tokenId, tokenId))
    .for("update");
  // the indexer may have held another transfer since the token was picked
  if (rows.length === 0 || rows.some((row) => !row.final)) return false;

  const [objekt] = await tx
    .select({ receivedAt: objekts.receivedAt })
    .from(objekts)
    .where(eq(objekts.id, tokenId))
    .for("update");
  const updates = await tx
    .select({
      id: transferabilityUpdates.id,
      transferable: transferabilityUpdates.transferable,
      blockNumber: transferabilityUpdates.blockNumber,
      transactionIndex: transferabilityUpdates.transactionIndex,
    })
    .from(transferabilityUpdates)
    .where(
      and(
        eq(transferabilityUpdates.tokenId, tokenId),
        isNull(transferabilityUpdates.appliedAt),
        // a change in a hot block waits for the leftover pass once it is final
        sql`${transferabilityUpdates.blockNumber} <= ${finalHeight}`,
      ),
    );

  const plan = planReplay({
    rows,
    objekt: objekt ?? null,
    updates,
    transferable: metadata.objekt.transferable,
  });
  if (!plan) return false;

  const slug = slugifyObjekt(metadata.objekt.collectionId);
  const collectionId = await ensureCollection(
    tx,
    slug,
    metadata,
    plan.insert?.mintedAt ?? plan.transfers[0]!.timestamp,
  );

  if (plan.insert) {
    await tx.insert(objekts).values({
      id: tokenId,
      ...plan.insert,
      serial: metadata.objekt.objektNo,
      collectionId,
    });
  }
  if (objekt) {
    // a token never changes collection, so a known objekt without one gets this one
    await tx
      .update(objekts)
      .set({ collectionId })
      .where(and(eq(objekts.id, tokenId), isNull(objekts.collectionId)));
  }
  if (plan.move) {
    await tx.update(objekts).set(plan.move).where(eq(objekts.id, tokenId));
  }
  if (plan.transferable !== null) {
    await tx
      .update(objekts)
      .set({ transferable: plan.transferable })
      .where(eq(objekts.id, tokenId));
  }

  await tx
    .insert(transfers)
    .values(
      plan.transfers.map((row) => ({
        id: row.id,
        from: row.from,
        to: row.to,
        timestamp: row.timestamp,
        tokenId,
        hash: row.hash,
        objektId: tokenId,
        collectionId,
      })),
    )
    .onConflictDoNothing();

  // the outbox names the collection by slug, as the indexer writes it
  if (plan.outbox.length > 0) {
    await tx.insert(listEventOutbox).values(
      plan.outbox.map((row) => ({
        transferId: row.id,
        fromAddress: row.from,
        toAddress: row.to,
        collectionId: slug,
        tokenId,
        timestamp: row.timestamp,
      })),
    );
  }

  if (updates.length > 0) {
    await tx
      .update(transferabilityUpdates)
      .set({ appliedAt: sql`now()` })
      .where(
        inArray(
          transferabilityUpdates.id,
          updates.map((update) => update.id),
        ),
      );
  }

  await tx.delete(pendingTransfers).where(
    inArray(
      pendingTransfers.id,
      rows.map((row) => row.id),
    ),
  );
  return true;
}

async function ensureCollection(
  tx: Tx,
  slug: string,
  metadata: CosmoObjektMetadataV1,
  createdAt: string,
) {
  const enriched = enrichUpdateMetadata(metadata, { version: 3 });
  await tx
    .insert(collections)
    .values({
      id: Bun.randomUUIDv7(),
      contract: addr(metadata.objekt.tokenAddress),
      createdAt,
      collectionId: metadata.objekt.collectionId,
      slug,
      ...enriched,
      backImage: enriched.backImage ?? metadata.objekt.backImage,
      textColor: enriched.textColor ?? metadata.objekt.textColor,
      accentColor: enriched.accentColor ?? metadata.objekt.accentColor,
    })
    .onConflictDoNothing({ target: collections.slug });

  // re-select for the canonical id: a conflict means the indexer created it with another id
  const [collection] = await tx
    .select({ id: collections.id })
    .from(collections)
    .where(eq(collections.slug, slug));
  if (!collection) throw new Error(`No collection ${slug} after insert`);
  return collection.id;
}
