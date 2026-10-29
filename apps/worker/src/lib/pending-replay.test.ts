import { describe, expect, test } from "bun:test";

import { Addresses } from "@repo/lib";

import { type HeldTransfer, planReplay } from "./pending-replay";

const A = "0x000000000000000000000000000000000000000a";
const B = "0x000000000000000000000000000000000000000b";

function row(over: Partial<HeldTransfer>): HeldTransfer {
  return {
    id: "t",
    tokenId: "50123",
    from: A,
    to: B,
    timestamp: "2026-10-29 10:00:00+00",
    hash: "0xhash",
    blockNumber: 100,
    logIndex: 0,
    ...over,
  };
}

const mint = row({
  id: "mint",
  from: Addresses.NULL,
  to: A,
  timestamp: "2026-10-29 10:00:00+00",
  blockNumber: 100,
  logIndex: 3,
});
const send = row({
  id: "send",
  from: A,
  to: B,
  timestamp: "2026-10-29 11:00:00+00",
  blockNumber: 200,
  logIndex: 1,
});

describe("planReplay", () => {
  test("replays a held mint and send into a new objekt", () => {
    const plan = planReplay({ rows: [send, mint], objekt: null, updates: [], transferable: true });
    expect(plan?.insert).toEqual({
      owner: B,
      receivedAt: send.timestamp,
      mintedAt: mint.timestamp,
      transferable: true,
    });
    expect(plan?.move).toBeNull();
    expect(plan?.transfers.map((t) => t.id)).toEqual(["mint", "send"]);
    expect(plan?.outbox.map((t) => t.id)).toEqual(["send"]);
  });

  test("orders rows in one block by log index", () => {
    const a = row({ id: "a", blockNumber: 5, logIndex: 9 });
    const b = row({ id: "b", blockNumber: 5, logIndex: 2 });
    const plan = planReplay({ rows: [a, b], objekt: null, updates: [], transferable: true });
    expect(plan?.transfers.map((t) => t.id)).toEqual(["b", "a"]);
  });

  test("takes the mint time from the oldest row when the mint is not held", () => {
    const plan = planReplay({ rows: [send], objekt: null, updates: [], transferable: true });
    expect(plan?.insert?.mintedAt).toBe(send.timestamp);
  });

  test("moves a known objekt only when the held row is newer", () => {
    const newer = planReplay({
      rows: [send],
      objekt: { receivedAt: "2026-10-29 10:30:00+00" },
      updates: [],
      transferable: true,
    });
    expect(newer?.insert).toBeNull();
    expect(newer?.move).toEqual({ owner: B, receivedAt: send.timestamp });

    const older = planReplay({
      rows: [send],
      objekt: { receivedAt: "2026-10-29 12:00:00+00" },
      updates: [],
      transferable: true,
    });
    expect(older?.move).toBeNull();
    expect(older?.transfers).toHaveLength(1);
  });

  test("moves a known objekt when the held row shares its received second", () => {
    const plan = planReplay({
      rows: [send],
      objekt: { receivedAt: send.timestamp },
      updates: [],
      transferable: true,
    });
    expect(plan?.move).toEqual({ owner: B, receivedAt: send.timestamp });
  });

  test("applies the latest held transferability change to a new objekt", () => {
    const plan = planReplay({
      rows: [mint],
      objekt: null,
      updates: [
        { transferable: false, blockNumber: 300, transactionIndex: 4 },
        { transferable: true, blockNumber: 300, transactionIndex: 1 },
        { transferable: true, blockNumber: 150, transactionIndex: 9 },
      ],
      transferable: true,
    });
    expect(plan?.insert?.transferable).toBe(false);
  });

  test("applies a held transferability change to a known objekt", () => {
    const plan = planReplay({
      rows: [send],
      objekt: { receivedAt: "2026-10-29 12:00:00+00" },
      updates: [{ transferable: false, blockNumber: 300, transactionIndex: 0 }],
      transferable: true,
    });
    expect(plan?.transferable).toBe(false);
  });

  test("keeps the metadata's transferable when nothing is held", () => {
    const plan = planReplay({ rows: [mint], objekt: null, updates: [], transferable: false });
    expect(plan?.insert?.transferable).toBe(false);
    expect(plan?.transferable).toBeNull();
  });

  test("a mint alone writes no outbox row", () => {
    const plan = planReplay({ rows: [mint], objekt: null, updates: [], transferable: true });
    expect(plan?.outbox).toHaveLength(0);
  });

  test("returns null for no rows", () => {
    expect(planReplay({ rows: [], objekt: null, updates: [], transferable: true })).toBeNull();
  });
});
