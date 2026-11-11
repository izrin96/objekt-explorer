import { describe, expect, test } from "bun:test";

import { Addresses } from "@repo/lib";
import { array, bool, bytes, struct } from "@subsquid/evm-codec";

import { func } from "./abi/abi.support";
import { aggregate3, MULTICALL3, MULTICALL3_DEPLOY_BLOCK } from "./abi/multicall3";
import { isObjektTransferable } from "./abi/objekt/functions";
import {
  type BatchClient,
  type ChunkTransfer,
  type RpcCall,
  decodeReads,
  mintReads,
  planReads,
  readTransferability,
} from "./mint-transferability";

const HASH_A = `0x${"a".repeat(64)}`;
const HASH_B = `0x${"b".repeat(64)}`;
const HASH_OLD = `0x${"c".repeat(64)}`;
const RECEIVER = "0x5dc815d158016e3a75e05bf264fe293131ce4c3d";

const mint = (tokenId: string, blockNumber: number, blockHash: string): ChunkTransfer => ({
  transfer: { tokenId, from: Addresses.NULL },
  blockNumber,
  blockHash,
});

const move = (tokenId: string, blockNumber: number, blockHash: string): ChunkTransfer => ({
  transfer: { tokenId, from: RECEIVER },
  blockNumber,
  blockHash,
});

const word = (value: boolean) => `0x${(value ? "1" : "0").padStart(64, "0")}`;

// the return of aggregate3, `(bool,bytes)[]`, encodes the same as a call taking it as its only argument
const aggregate3Return = func("0x00000000", {
  results: array(struct({ success: bool, returnData: bytes })),
});

function aggregateResult(results: { success: boolean; returnData: string }[]) {
  return `0x${aggregate3Return.encode({ results }).slice(10)}`;
}

/** Answers each call the way the node would, from a `tokenId → transferable` table. */
function fakeClient(chain: Record<string, boolean>, fail = new Set<string>()) {
  const calls: RpcCall[] = [];
  return {
    calls,
    async batchCall(batch: RpcCall[]) {
      calls.push(...batch);
      return batch.map(({ params }) => {
        const { to, data } = params[0] as { to: string; data: string };
        if (to === Addresses.OBJEKT) {
          return word(chain[String(isObjektTransferable.decode(data)._0)]!);
        }
        const { calls: inner } = aggregate3.decode(data);
        return aggregateResult(
          inner.map((c) => {
            const tokenId = String(isObjektTransferable.decode(c.callData)._0);
            return fail.has(tokenId)
              ? { success: false, returnData: "0x" }
              : { success: true, returnData: word(chain[tokenId]!) };
          }),
        );
      });
    },
  };
}

async function rejection(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return (error as Error).message;
  }
  return "resolved";
}

const plan = (transfers: ChunkTransfer[]) => planReads(mintReads(transfers));
const readMints = (client: BatchClient, transfers: ChunkTransfer[]) =>
  readTransferability(client, mintReads(transfers));

describe("planReads of a chunk's mints", () => {
  test("only mints are read", () => {
    const reads = plan([mint("1", 89_019_706, HASH_A), move("2", 89_019_706, HASH_A)]);
    expect(reads).toHaveLength(1);
    expect(reads[0]!.tokenIds).toEqual(["1"]);
  });

  test("a chunk with no mints makes no call", () => {
    expect(plan([move("2", 89_019_706, HASH_A)])).toEqual([]);
  });

  test("mints are grouped into one aggregate3 per block, pinned by hash", () => {
    const reads = plan([
      mint("1", 89_019_706, HASH_A),
      mint("2", 89_019_706, HASH_A),
      mint("3", 89_019_716, HASH_B),
    ]);
    expect(reads.map((r) => r.tokenIds)).toEqual([["1", "2"], ["3"]]);
    expect(reads.map((r) => r.call.params[1])).toEqual([
      { blockHash: HASH_A },
      { blockHash: HASH_B },
    ]);
    for (const read of reads) {
      const { to, data } = read.call.params[0] as { to: string; data: string };
      expect(read.call.method).toBe("eth_call");
      expect(to).toBe(MULTICALL3);
      const { calls } = aggregate3.decode(data);
      expect(calls.map((c) => c.allowFailure)).toEqual(read.tokenIds.map(() => true));
      expect(calls.map((c) => c.target)).toEqual(read.tokenIds.map(() => Addresses.OBJEKT));
      expect(calls.map((c) => String(isObjektTransferable.decode(c.callData)._0))).toEqual(
        read.tokenIds,
      );
    }
  });

  test("before Multicall3, each token is its own eth_call to the objekt contract", () => {
    const old = MULTICALL3_DEPLOY_BLOCK - 1;
    const reads = plan([mint("7", old, HASH_OLD), mint("8", old, HASH_OLD)]);
    expect(reads).toHaveLength(2);
    for (const [i, read] of reads.entries()) {
      const { to, data } = read.call.params[0] as { to: string; data: string };
      expect(to).toBe(Addresses.OBJEKT);
      expect(read.call.params[1]).toEqual({ blockHash: HASH_OLD });
      expect(String(isObjektTransferable.decode(data)._0)).toBe(["7", "8"][i]!);
    }
  });

  test("the deploy block itself goes through Multicall3", () => {
    const [read] = plan([mint("9", MULTICALL3_DEPLOY_BLOCK, HASH_A)]);
    expect((read!.call.params[0] as { to: string }).to).toBe(MULTICALL3);
  });
});

describe("readTransferability", () => {
  test("maps each minted token to the chain's value", async () => {
    const client = fakeClient({ "30938969": false, "30938970": false, "1": true });
    const map = await readMints(client, [
      mint("30938969", 89_019_706, HASH_A),
      mint("1", 89_019_706, HASH_A),
      mint("30938970", 89_019_716, HASH_B),
      move("2", 89_019_716, HASH_B),
    ]);
    expect(client.calls).toHaveLength(2);
    expect(Object.fromEntries(map)).toEqual({ "30938969": false, "1": true, "30938970": false });
  });

  test("reads the pre-Multicall3 path", async () => {
    const old = MULTICALL3_DEPLOY_BLOCK - 1;
    const client = fakeClient({ "7": true, "8": false });
    const map = await readMints(client, [mint("7", old, HASH_OLD), mint("8", old, HASH_OLD)]);
    expect(Object.fromEntries(map)).toEqual({ "7": true, "8": false });
  });

  test("reads a token at a non-mint transfer's own block", async () => {
    const client = fakeClient({ "2": true });
    const map = await readTransferability(client, [
      { tokenId: "2", blockNumber: 89_019_723, blockHash: HASH_B },
    ]);
    expect(client.calls.map((c) => c.params[1])).toEqual([{ blockHash: HASH_B }]);
    expect(Object.fromEntries(map)).toEqual({ "2": true });
  });

  test("makes no call for a chunk with no mints", async () => {
    const client = fakeClient({});
    expect((await readMints(client, [move("2", 1, HASH_A)])).size).toBe(0);
    expect(client.calls).toHaveLength(0);
  });

  test("a failed entry throws instead of guessing", async () => {
    const client = fakeClient({ "1": true, "2": true }, new Set(["2"]));
    const read = readMints(client, [mint("1", 89_019_706, HASH_A), mint("2", 89_019_706, HASH_A)]);
    expect(await rejection(read)).toBe("isObjektTransferable(2) failed");
  });

  test("a failed RPC call rejects", async () => {
    const client = {
      batchCall: () => Promise.reject(new Error("rpc down")),
    };
    const read = readMints(client, [mint("1", 89_019_706, HASH_A)]);
    expect(await rejection(read)).toBe("rpc down");
  });
});

describe("decodeReads", () => {
  const reads = plan([mint("1", 89_019_706, HASH_A), mint("2", 89_019_716, HASH_B)]);

  test("a missing result throws", () => {
    expect(() =>
      decodeReads(reads, [aggregateResult([{ success: true, returnData: word(true) }])]),
    ).toThrow();
    expect(() =>
      decodeReads(reads, [aggregateResult([{ success: true, returnData: word(true) }]), null]),
    ).toThrow("Missing transferability read");
  });

  test("fewer entries than tokens throws", () => {
    const [read] = plan([mint("1", 89_019_706, HASH_A), mint("3", 89_019_706, HASH_A)]);
    expect(() =>
      decodeReads([read!], [aggregateResult([{ success: true, returnData: word(true) }])]),
    ).toThrow("Expected 2 transferability entries, got 1");
  });

  test("an empty return before Multicall3 throws instead of reading true", () => {
    const old = plan([mint("7", MULTICALL3_DEPLOY_BLOCK - 1, HASH_OLD)]);
    expect(() => decodeReads(old, ["0x"])).toThrow("isObjektTransferable(7) returned 0x");
  });

  test("an empty return from a successful entry throws instead of reading true", () => {
    expect(() =>
      decodeReads(reads, [
        aggregateResult([{ success: true, returnData: "0x" }]),
        aggregateResult([{ success: true, returnData: word(false) }]),
      ]),
    ).toThrow();
  });
});
