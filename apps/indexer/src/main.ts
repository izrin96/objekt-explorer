import { emptyMetadata } from "@repo/cosmo/server/metadata";
import type { CosmoObjektMetadataV1 } from "@repo/cosmo/types/metadata";
import { addr, chunk, slugifyObjekt, Addresses } from "@repo/lib";
import { TypeormDatabase, type Store } from "@subsquid/typeorm-store";
import { IsNull } from "typeorm";
import { v7 as randomUUID } from "uuid";

import { env } from "./env";
import { fetchMetadata } from "./metadata";
import {
  Collection,
  ComoBalance,
  ListEventOutbox,
  Objekt,
  type Transfer,
  TransferabilityUpdate,
  Vote,
} from "./model";
import {
  type ComoBalanceEvent,
  type RevealFunction,
  type TransferabilityUpdateEvent,
  type VoteEvent,
  parseBlocks,
} from "./parser";
import { processor, type ProcessorContext } from "./processor";
import { redis } from "./redis";

const db = new TypeormDatabase({ supportHotBlocks: true });

processor.run(db, async (ctx) => {
  const { transfers, transferability, comoBalanceUpdates, votes, reveals } = parseBlocks(
    ctx.blocks,
  );

  if (env.ENABLE_OBJEKTS) {
    if (transfers.length > 0) {
      ctx.log.info(`Processing ${transfers.length} objekt transfers`);
    }

    const transferBatchAll: Transfer[] = [];

    // chunk everything into batches
    await chunk(transfers, env.COSMO_PARALLEL_COUNT, async (chunk) => {
      const transferBatch: Transfer[] = [];
      const collectionBatch = new Map<string, Collection>();
      const objektBatch = new Map<string, Objekt>();

      const metadataBatch = env.SKIP_METADATA
        ? chunk.map((e) => ({ status: "fulfilled" as const, value: emptyMetadata(e.tokenId) }))
        : await Promise.allSettled(chunk.map((e) => fetchMetadata(e.tokenId)));
      const newlyMintedIds: string[] = [];

      // iterate over each objekt metadata request
      for (let j = 0; j < metadataBatch.length; j++) {
        const request = metadataBatch[j];
        const transfer = chunk[j];
        if (!transfer || !request || request.status === "rejected") {
          ctx.log.error(`Unable to fetch metadata for token ${transfer?.tokenId ?? "unknown"}`);
          continue;
        }

        // handle collection
        const collection = await handleCollection(ctx, request.value, collectionBatch, transfer);
        collectionBatch.set(collection.slug, collection);

        // handle objekt
        const { objekt, isNew } = await handleObjekt(ctx, request.value, objektBatch, transfer);
        objekt.collection = collection;
        objektBatch.set(objekt.id, objekt);
        if (isNew) {
          newlyMintedIds.push(objekt.id);
        }

        // handle transfer
        transfer.objekt = objekt;
        transfer.collection = collection;
        transferBatch.push(transfer);
      }

      // apply any pending transferability updates that were waiting for these mints
      if (newlyMintedIds.length > 0) {
        await applyPendingTransferabilityUpdates(ctx, objektBatch, newlyMintedIds);
      }

      // upsert collections
      if (collectionBatch.size > 0) {
        await ctx.store.upsert(Array.from(collectionBatch.values()));
      }

      // upsert objekts
      if (objektBatch.size > 0) {
        await ctx.store.upsert(Array.from(objektBatch.values()));
      }

      // upsert transfers
      if (transferBatch.length > 0) {
        await ctx.store.upsert(transferBatch);
        transferBatchAll.push(...transferBatch);
      }

      // mints should not be inserted into the outbox
      const userTransfers = transferBatch.filter((t) => t.from !== Addresses.NULL);

      // insert outbox rows
      if (!env.SKIP_OUTBOX && userTransfers.length > 0) {
        const outboxRows = userTransfers.map(
          (t) =>
            new ListEventOutbox({
              transferId: t.id,
              fromAddress: t.from,
              toAddress: t.to,
              collectionId: t.collection.slug,
              tokenId: t.tokenId,
              timestamp: new Date(t.timestamp),
            }),
        );
        await ctx.store.insert(outboxRows);
      }
    });

    // publish transfers to redis for websocket broadcast
    if (transferBatchAll.length > 0) {
      redis
        .publish("transfers", JSON.stringify(transferBatchAll))
        .catch((error) => ctx.log.warn(`Failed to publish transfers to Redis: ${error}`));
    }

    // process transferability updates separately from transfers
    if (transferability.length > 0) {
      ctx.log.info(`Handling ${transferability.length} transferability updates`);
      await handleTransferabilityUpdates(ctx, transferability);
    }

    // #region como balance updates
    if (comoBalanceUpdates.length > 0) {
      ctx.log.info(`Processing ${comoBalanceUpdates.length} COMO balance updates`);
    }

    await chunk(comoBalanceUpdates, 2000, async (chunk) => {
      const comoBalanceBatch = new Map<string, ComoBalance>();
      for (const event of chunk) {
        const balances = await handleComoBalanceUpdate(ctx, comoBalanceBatch, event);

        for (const balance of balances) {
          comoBalanceBatch.set(
            balanceKey({ owner: balance.owner, tokenId: balance.tokenId }),
            balance,
          );
        }
      }

      if (comoBalanceBatch.size > 0) {
        await ctx.store.upsert(Array.from(comoBalanceBatch.values()));
      }
    });
    // #endregion
  }

  if (env.ENABLE_GRAVITY) {
    // #region votes
    const voteBatch: Vote[] = [];

    if (votes.length > 0) {
      ctx.log.info(`Processing ${votes.length} gravity votes`);
    }

    for (const event of votes) {
      const vote = handleVoteCreation(event);
      voteBatch.push(vote);
    }

    if (voteBatch.length > 0) {
      await ctx.store.upsert(voteBatch);
    }
    // #endregion

    // #region reveals
    if (reveals.length > 0) {
      ctx.log.info(`Processing ${reveals.length} gravity reveals`);
      await handleReveals(ctx, reveals);
    }
    // #endregion
  }
});

/**
 * Create or update the collection row.
 */
async function handleCollection(
  ctx: ProcessorContext<Store>,
  metadata: CosmoObjektMetadataV1,
  buffer: Map<string, Collection>,
  transfer: Transfer,
) {
  const slug = slugifyObjekt(metadata.objekt.collectionId);

  // fetch from db
  let collection = await ctx.store.get(Collection, {
    where: {
      slug: slug,
    },
  });

  // fetch out of buffer
  if (!collection) {
    collection = buffer.get(slug);
  }

  // create
  if (!collection) {
    collection = new Collection({
      id: randomUUID(),
      contract: addr(metadata.objekt.tokenAddress),
      createdAt: new Date(transfer.timestamp),
      collectionId: metadata.objekt.collectionId,
      slug: slug,
      textColor: metadata.objekt.textColor,
      backImage: metadata.objekt.backImage,
      accentColor: metadata.objekt.accentColor,
    });
  }

  // set and/or update metadata
  collection.season = metadata.objekt.season;
  collection.member = metadata.objekt.member;
  collection.artist = metadata.objekt.artists[0]!.toLowerCase();
  collection.collectionNo = metadata.objekt.collectionNo;
  collection.class = metadata.objekt.class;
  collection.comoAmount = metadata.objekt.comoAmount;
  collection.onOffline = metadata.objekt.collectionNo.includes("Z") ? "online" : "offline";
  collection.thumbnailImage = metadata.objekt.thumbnailImage;
  collection.frontImage = metadata.objekt.frontImage;
  collection.backgroundColor = metadata.objekt.backgroundColor;

  return collection;
}

/**
 * Create or update the objekt row.
 */
async function handleObjekt(
  ctx: ProcessorContext<Store>,
  metadata: CosmoObjektMetadataV1,
  buffer: Map<string, Objekt>,
  transfer: Transfer,
) {
  // fetch out of buffer
  let objekt = buffer.get(transfer.tokenId);

  // fetch from db
  if (!objekt) {
    objekt = await ctx.store.get(Objekt, transfer.tokenId);
  }

  // if not new, update fields. skip transferable
  if (objekt) {
    objekt.receivedAt = new Date(transfer.timestamp);
    objekt.owner = addr(transfer.to);
    return { objekt, isNew: false };
  }

  // otherwise create it
  objekt = new Objekt({
    id: transfer.tokenId,
    mintedAt: new Date(transfer.timestamp),
    receivedAt: new Date(transfer.timestamp),
    owner: addr(transfer.to),
    serial: metadata.objekt.objektNo,
    transferable: metadata.objekt.transferable,
  });

  return { objekt, isNew: true };
}

/**
 * Record every transferability update as an append-only audit row, applying it
 * immediately when the objekt already exists. Updates for objekts that don't
 * exist yet (e.g. their mint transfer hasn't been seen) are left pending
 * (appliedAt = null) and picked up later by applyPendingTransferabilityUpdates
 * once the objekt is minted, instead of being silently dropped.
 */
async function handleTransferabilityUpdates(
  ctx: ProcessorContext<Store>,
  updates: TransferabilityUpdateEvent[],
) {
  const objektBatch = new Map<string, Objekt>();
  const updateRows: TransferabilityUpdate[] = [];

  for (const update of updates) {
    const objekt = await ctx.store.get(Objekt, update.tokenId);
    const appliedNow = objekt !== undefined;

    if (objekt) {
      objekt.transferable = update.transferable;
      objektBatch.set(objekt.id, objekt);
    } else {
      ctx.log.warn(
        `Objekt ${update.tokenId} not found yet for transferability update, marking pending`,
      );
    }

    updateRows.push(
      new TransferabilityUpdate({
        id: randomUUID(),
        tokenId: update.tokenId,
        transferable: update.transferable,
        blockNumber: update.blockNumber,
        transactionIndex: update.transactionIndex,
        hash: update.hash,
        appliedAt: appliedNow ? new Date() : null,
      }),
    );
  }

  if (updateRows.length > 0) {
    await ctx.store.insert(updateRows);
  }
  if (objektBatch.size > 0) {
    await ctx.store.upsert(Array.from(objektBatch.values()));
  }
}

/**
 * Apply any transferability updates that arrived before their objekt was
 * minted, now that the objekt(s) in `newlyMintedIds` exist. Mutates the
 * matching entries in `objektBatch` in place so the caller's upsert picks up
 * the corrected transferable value in the same write.
 */
async function applyPendingTransferabilityUpdates(
  ctx: ProcessorContext<Store>,
  objektBatch: Map<string, Objekt>,
  newlyMintedIds: string[],
) {
  const pending = await ctx.store.find(TransferabilityUpdate, {
    where: newlyMintedIds.map((tokenId) => ({ tokenId, appliedAt: IsNull() })),
    order: { blockNumber: "ASC", transactionIndex: "ASC" },
  });
  if (pending.length === 0) {
    return;
  }

  // keep only the latest pending update per tokenId
  const latestByTokenId = new Map<string, TransferabilityUpdate>();
  for (const update of pending) {
    latestByTokenId.set(update.tokenId, update);
  }

  const now = new Date();
  for (const update of pending) {
    update.appliedAt = now;
  }
  await ctx.store.upsert(pending);

  for (const [tokenId, update] of latestByTokenId) {
    const objekt = objektBatch.get(tokenId);
    if (objekt) {
      objekt.transferable = update.transferable;
    }
  }
}

const EXCLUDE = Object.values(Addresses);

/**
 * Update como balance.
 */
async function handleComoBalanceUpdate(
  ctx: ProcessorContext<Store>,
  buffer: Map<string, ComoBalance>,
  event: ComoBalanceEvent,
) {
  const toUpdate: ComoBalance[] = [];

  if (EXCLUDE.includes(event.from) === false) {
    const from = await getBalance(ctx, buffer, event.from, event.tokenId);

    from.amount -= event.value;
    toUpdate.push(from);
  }

  if (EXCLUDE.includes(event.to) === false) {
    const to = await getBalance(ctx, buffer, event.to, event.tokenId);

    to.amount += event.value;
    toUpdate.push(to);
  }

  return toUpdate;
}

/**
 * For the sake of not being able to mess this up.
 */
function balanceKey({ owner, tokenId }: { owner: string; tokenId: number }) {
  return `${owner}-${tokenId}`;
}

/**
 * Fetch a como balance from the buffer, db or create a new one.
 */
async function getBalance(
  ctx: ProcessorContext<Store>,
  buffer: Map<string, ComoBalance>,
  owner: string,
  tokenId: number,
) {
  let balance = buffer.get(balanceKey({ owner, tokenId }));

  // fetch from db
  if (!balance) {
    balance = await ctx.store.get(ComoBalance, {
      where: { owner, tokenId },
    });
  }

  // create
  if (!balance) {
    balance = new ComoBalance({
      id: randomUUID(),
      tokenId: tokenId,
      owner: owner,
      amount: BigInt(0),
    });
  }

  return balance;
}

/**
 * Create a new vote row.
 */
function handleVoteCreation(event: VoteEvent) {
  return new Vote({
    id: randomUUID(),
    from: event.from,
    createdAt: new Date(event.timestamp),
    tokenId: event.tokenId,
    pollId: event.pollId,
    amount: event.tokenAmount,
    blockNumber: event.blockNumber,
    logIndex: event.logIndex,
    hash: event.hash,
    candidateId: null,
  });
}

/**
 * Match reveals to votes and update candidateId.
 */
async function handleReveals(ctx: ProcessorContext<Store>, reveals: RevealFunction[]) {
  // Group reveals by (tokenId, pollId)
  const grouped = new Map<string, RevealFunction[]>();
  for (const reveal of reveals) {
    const key = `${reveal.tokenId}-${reveal.pollId}`;
    const existing = grouped.get(key) ?? [];
    existing.push(reveal);
    grouped.set(key, existing);
  }

  for (const [key, pollReveals] of grouped) {
    const [tokenId, pollId] = key.split("-").map(Number);

    // Get all votes for this poll, ordered by position (blockNumber, logIndex)
    const votes = await ctx.store.find(Vote, {
      where: { tokenId, pollId },
      order: { blockNumber: "ASC", logIndex: "ASC" },
    });

    // Match each reveal to its vote by position
    const toUpdate: Vote[] = [];
    for (const reveal of pollReveals) {
      const vote = votes[reveal.position];
      if (vote && vote.candidateId === null) {
        vote.candidateId = reveal.candidateId;
        toUpdate.push(vote);
      }
    }

    if (toUpdate.length > 0) {
      await ctx.store.upsert(toUpdate);
    }
  }
}
