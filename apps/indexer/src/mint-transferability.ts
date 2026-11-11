import { Addresses } from "@repo/lib";

import { aggregate3, MULTICALL3, MULTICALL3_DEPLOY_BLOCK } from "./abi/multicall3";
import { isObjektTransferable } from "./abi/objekt/functions";

export type ChunkTransfer = {
  transfer: { tokenId: string; from: string };
  blockNumber: number;
  blockHash: string;
};

/** A token whose transferability is read at the end of a block. */
export type TokenRead = { tokenId: string; blockNumber: number; blockHash: string };

export type RpcCall = { method: string; params: unknown[] };

export type BatchClient = {
  batchCall(batch: RpcCall[]): Promise<unknown[]>;
};

type Read = { call: RpcCall; tokenIds: string[]; multicall: boolean };

export function isMint(transfer: { from: string }) {
  return transfer.from === Addresses.NULL;
}

/** The chunk's mints, each to be read at its mint block. */
export function mintReads(transfers: ChunkTransfer[]): TokenRead[] {
  return transfers
    .filter(({ transfer }) => isMint(transfer))
    .map(({ transfer, blockNumber, blockHash }) => ({
      tokenId: transfer.tokenId,
      blockNumber,
      blockHash,
    }));
}

/**
 * One read per block: an `aggregate3` over every token in it, or, before Multicall3 existed, one
 * `isObjektTransferable` call per token. Pinned by hash so a hot block is read on the fork being
 * indexed.
 */
export function planReads(tokens: TokenRead[]): Read[] {
  const blocks = new Map<string, { blockNumber: number; tokenIds: Set<string> }>();
  for (const { tokenId, blockNumber, blockHash } of tokens) {
    const block = blocks.get(blockHash) ?? { blockNumber, tokenIds: new Set<string>() };
    block.tokenIds.add(tokenId);
    blocks.set(blockHash, block);
  }

  const reads: Read[] = [];
  for (const [blockHash, { blockNumber, tokenIds }] of blocks) {
    const ids = [...tokenIds];
    const encode = (tokenId: string) => isObjektTransferable.encode({ _0: BigInt(tokenId) });
    if (blockNumber < MULTICALL3_DEPLOY_BLOCK) {
      for (const tokenId of ids) {
        reads.push({
          call: ethCall(Addresses.OBJEKT, encode(tokenId), blockHash),
          tokenIds: [tokenId],
          multicall: false,
        });
      }
      continue;
    }
    const data = aggregate3.encode({
      calls: ids.map((tokenId) => ({
        target: Addresses.OBJEKT,
        allowFailure: true,
        callData: encode(tokenId),
      })),
    });
    reads.push({ call: ethCall(MULTICALL3, data, blockHash), tokenIds: ids, multicall: true });
  }
  return reads;
}

function ethCall(to: string, data: string, blockHash: string): RpcCall {
  return { method: "eth_call", params: [{ to, data }, { blockHash }] };
}

/**
 * Each read's result as `tokenId → transferable`. Throws on a failed entry or a missing result:
 * a guess here is the bug this read exists to fix.
 */
export function decodeReads(reads: Read[], results: unknown[]) {
  if (results.length !== reads.length) {
    throw new Error(`Expected ${reads.length} transferability reads, got ${results.length}`);
  }
  const transferable = new Map<string, boolean>();
  for (const [i, read] of reads.entries()) {
    const result = results[i];
    if (typeof result !== "string") {
      throw new Error(`Missing transferability read for tokens ${read.tokenIds.join(", ")}`);
    }
    if (!read.multicall) {
      transferable.set(read.tokenIds[0]!, decodeBool(read.tokenIds[0]!, result));
      continue;
    }
    const entries = aggregate3.decodeResult(result);
    if (entries.length !== read.tokenIds.length) {
      throw new Error(
        `Expected ${read.tokenIds.length} transferability entries, got ${entries.length}`,
      );
    }
    for (const [j, tokenId] of read.tokenIds.entries()) {
      const entry = entries[j]!;
      if (!entry.success) {
        throw new Error(`isObjektTransferable(${tokenId}) failed`);
      }
      transferable.set(tokenId, decodeBool(tokenId, entry.returnData));
    }
  }
  return transferable;
}

const BOOL_WORD = /^0x0{63}[01]$/;

// the codec reads an empty return (no code at the target) as true, so check the word first
function decodeBool(tokenId: string, data: string) {
  if (!BOOL_WORD.test(data)) {
    throw new Error(`isObjektTransferable(${tokenId}) returned ${data}`);
  }
  return isObjektTransferable.decodeResult(data);
}

/** `tokenId → transferable` for each token at the end of its block. */
export async function readTransferability(client: BatchClient, tokens: TokenRead[]) {
  const reads = planReads(tokens);
  if (reads.length === 0) return new Map<string, boolean>();
  const results = await client.batchCall(reads.map((read) => read.call));
  return decodeReads(reads, results);
}
