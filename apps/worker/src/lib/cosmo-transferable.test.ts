import { describe, expect, test } from "bun:test";

import { Addresses } from "@repo/lib";

import {
  confirmationOf,
  judgeTransferable,
  outcomeCounts,
  settleOutcome,
  transferableBreaker,
  type StoredOutcome,
  type TransferableRead,
} from "./cosmo-transferable";

const OBSERVED = "2026-11-17T00:00:00.000Z";
const RECEIVED = "2026-11-01T00:00:00.000Z";
// gridded by default, so the untransferable direction can write
const read = (extra: Partial<TransferableRead> = {}): TransferableRead => ({
  tokenId: "101",
  slug: "summer26-seoyeon-101z",
  transferable: true,
  nonTransferableReason: "challenge-reward",
  usedForGrid: true,
  observedAt: OBSERVED,
  receivedAt: RECEIVED,
  chainHeight: 900,
  ...extra,
});
const objekt = (extra: object = {}) => ({
  transferable: true,
  owner: "0x1111111111111111111111111111111111111111",
  receivedAt: RECEIVED,
  slug: "summer26-seoyeon-101z",
  newerChange: false,
  ...extra,
});
const both = { untransferable: true, transferable: true };
const none = { untransferable: false, transferable: false };

describe("judgeTransferable", () => {
  test("missing without an objekt or under another collection", () => {
    expect(judgeTransferable(null, read(), both)).toBe("missing");
    expect(judgeTransferable(objekt({ slug: "other-101z" }), read(), both)).toBe("missing");
  });

  test("missing when the indexer lacked the token at the read", () => {
    expect(judgeTransferable(objekt(), read({ receivedAt: null }), both)).toBe("missing");
  });

  test("moved when the indexer's received_at is not the recorded one", () => {
    expect(
      judgeTransferable(objekt({ receivedAt: "2026-11-17T00:00:01.000Z" }), read(), both),
    ).toBe("moved");
    // received again before the read was even taken: still not the holder the chain confirmed
    expect(
      judgeTransferable(objekt({ receivedAt: "2026-11-10T00:00:00.000Z" }), read(), both),
    ).toBe("moved");
  });

  test("the recorded received_at in another notation is the same instant", () => {
    const o = objekt({ receivedAt: "2026-11-01 09:00:00.000000+09" });
    expect(judgeTransferable(o, read(), both)).toBe("matched");
  });

  test("a read that agrees but moved is moved, not matched", () => {
    const o = objekt({ receivedAt: "2026-11-18T00:00:00.000Z" });
    expect(judgeTransferable(o, read({ transferable: true }), both)).toBe("moved");
  });

  test("chain_newer when a newer or unapplied change exists", () => {
    expect(judgeTransferable(objekt({ newerChange: true }), read(), both)).toBe("chain_newer");
  });

  test("moved outranks chain_newer, and chain_newer outranks spin", () => {
    const o = objekt({ receivedAt: "2026-11-18T00:00:00.000Z", newerChange: true });
    expect(judgeTransferable(o, read(), both)).toBe("moved");
    const s = objekt({ newerChange: true, owner: Addresses.SPIN });
    expect(judgeTransferable(s, read(), both)).toBe("chain_newer");
  });

  test("spin in any letter case", () => {
    for (const owner of [
      Addresses.SPIN,
      Addresses.SPIN.toLowerCase(),
      Addresses.SPIN.toUpperCase(),
    ]) {
      expect(judgeTransferable(objekt({ owner, transferable: false }), read(), both)).toBe("spin");
    }
  });

  test("matched when the values agree", () => {
    expect(judgeTransferable(objekt(), read(), none)).toBe("matched");
    expect(
      judgeTransferable(objekt({ transferable: false }), read({ transferable: false }), none),
    ).toBe("matched");
  });

  test("a direction that is off reports", () => {
    expect(judgeTransferable(objekt(), read({ transferable: false }), none)).toBe(
      "report_untransferable",
    );
    expect(judgeTransferable(objekt({ transferable: false }), read(), none)).toBe(
      "report_transferable",
    );
  });

  test("a direction that is on plans a write", () => {
    expect(judgeTransferable(objekt(), read({ transferable: false }), both)).toBe(
      "write_untransferable",
    );
    expect(judgeTransferable(objekt({ transferable: false }), read(), both)).toBe(
      "write_transferable",
    );
  });

  test("each direction follows its own switch", () => {
    const onlyUntransferable = { untransferable: true, transferable: false };
    expect(judgeTransferable(objekt(), read({ transferable: false }), onlyUntransferable)).toBe(
      "write_untransferable",
    );
    expect(judgeTransferable(objekt({ transferable: false }), read(), onlyUntransferable)).toBe(
      "report_transferable",
    );
    const onlyTransferable = { untransferable: false, transferable: true };
    expect(judgeTransferable(objekt(), read({ transferable: false }), onlyTransferable)).toBe(
      "report_untransferable",
    );
    expect(judgeTransferable(objekt({ transferable: false }), read(), onlyTransferable)).toBe(
      "write_transferable",
    );
  });
});

describe("untransferable writes trust only grid use", () => {
  test("a gridded read writes, whatever its reason", () => {
    for (const reason of ["challenge-reward", "other", null]) {
      const r = read({ transferable: false, nonTransferableReason: reason, usedForGrid: true });
      expect(judgeTransferable(objekt(), r, both)).toBe("write_untransferable");
    }
  });

  test("a read not used in a grid is reported, welcome-objekt included", () => {
    for (const reason of ["welcome-objekt", "challenge-reward", "other", null]) {
      const r = read({ transferable: false, nonTransferableReason: reason, usedForGrid: false });
      expect(judgeTransferable(objekt(), r, both)).toBe("report_untransferable");
    }
  });

  test("the transferable direction needs no grid use", () => {
    const r = read({ transferable: true, nonTransferableReason: null, usedForGrid: false });
    expect(judgeTransferable(objekt({ transferable: false }), r, both)).toBe("write_transferable");
  });
});

describe("transferableBreaker", () => {
  test("a few writes in a small run pass under the floor of 50", () => {
    expect(transferableBreaker(30, 30)).toEqual({ tripped: false, limit: 50 });
    expect(transferableBreaker(50, 60)).toEqual({ tripped: false, limit: 50 });
    expect(transferableBreaker(51, 60)).toEqual({ tripped: true, limit: 50 });
  });

  test("20% of the reads above the floor", () => {
    expect(transferableBreaker(100, 500)).toEqual({ tripped: false, limit: 100 });
    expect(transferableBreaker(101, 500)).toEqual({ tripped: true, limit: 100 });
  });

  test("never more than 200, however many reads", () => {
    expect(transferableBreaker(200, 5000)).toEqual({ tripped: false, limit: 200 });
    expect(transferableBreaker(201, 5000)).toEqual({ tripped: true, limit: 200 });
  });

  test("no writes never trips", () => {
    expect(transferableBreaker(0, 0).tripped).toBe(false);
  });
});

describe("confirmationOf", () => {
  const o = objekt();
  const stored: StoredOutcome[] = [
    "missing",
    "moved",
    "chain_newer",
    "spin",
    "matched",
    "report_untransferable",
    "report_transferable",
    "written_untransferable",
    "written_transferable",
    "raced",
  ];

  test("gives a row only for matched and written_*", () => {
    const withRow = stored.filter((s) => confirmationOf(s, read(), o) !== null);
    expect(withRow).toEqual(["matched", "written_untransferable", "written_transferable"]);
  });

  test("the row holds the read's value and the judged received_at", () => {
    expect(confirmationOf("written_untransferable", read({ transferable: false }), o)).toEqual({
      tokenId: "101",
      transferable: false,
      observedAt: OBSERVED,
      chainHeight: 900,
      receivedAt: o.receivedAt,
    });
  });
});

describe("outcomeCounts", () => {
  test("counts each outcome", () => {
    expect(outcomeCounts(["matched", "moved", "matched"])).toEqual({ matched: 2, moved: 1 });
    expect(outcomeCounts([])).toEqual({});
  });
});

describe("settleOutcome", () => {
  test("a planned write becomes written when the UPDATE returned it, raced when not", () => {
    expect(settleOutcome("write_untransferable", true)).toBe("written_untransferable");
    expect(settleOutcome("write_untransferable", false)).toBe("raced");
    expect(settleOutcome("write_transferable", true)).toBe("written_transferable");
    expect(settleOutcome("write_transferable", false)).toBe("raced");
  });

  test("any other outcome is stored as judged", () => {
    expect(settleOutcome("matched", false)).toBe("matched");
    expect(settleOutcome("report_transferable", true)).toBe("report_transferable");
    expect(settleOutcome("moved", false)).toBe("moved");
  });
});
