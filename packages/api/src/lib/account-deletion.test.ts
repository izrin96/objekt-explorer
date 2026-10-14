import { describe, expect, test } from "bun:test";

import {
  type DeletionSanction,
  type DeletionTrade,
  deletionBlockers,
  deletionStep,
  hasDeliverableEmail,
  refusalOf,
} from "./account-deletion";
import { cancelRefusal } from "./offer-rules";

const NOW = new Date("2026-10-13T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const MINUTE = 60 * 1000;
const at = (offsetMs: number) => new Date(NOW.getTime() + offsetMs);

const trade = (overrides: Partial<DeletionTrade> = {}): DeletionTrade => ({
  id: 1042,
  partnerId: "kaede",
  status: "in_progress",
  acceptedAt: at(-2 * DAY),
  endedAt: null,
  verifiedLegs: 0,
  heldCopies: 0,
  ...overrides,
});

const sanction = (overrides: Partial<DeletionSanction> = {}): DeletionSanction => ({
  type: "chat_mute",
  expiresAt: at(7 * DAY),
  revokedAt: null,
  ...overrides,
});

const blockersOf = (trades: DeletionTrade[], sanctions: DeletionSanction[] = []) =>
  deletionBlockers({ trades, sanctions, now: NOW });

describe("sanctions", () => {
  test("a warning, an expired and a revoked sanction don't block", () => {
    expect(
      blockersOf(
        [],
        [
          sanction({ type: "warn", expiresAt: null }),
          sanction({ expiresAt: at(-DAY) }),
          sanction({ expiresAt: NOW }),
          sanction({ type: "ban", expiresAt: null, revokedAt: at(-DAY) }),
        ],
      ),
    ).toEqual([]);
  });

  test("a ban with no end blocks, sorted last", () => {
    expect(blockersOf([trade()], [sanction({ type: "ban", expiresAt: null }), sanction()])).toEqual(
      [
        expect.objectContaining({ kind: "sanction", type: "chat_mute" }),
        expect.objectContaining({ kind: "trade", tradeId: 1042 }),
        { kind: "sanction", type: "ban", until: null },
      ],
    );
  });
});

describe("trades", () => {
  test("completed, failed and cancelled trades don't block", () => {
    expect(
      blockersOf([
        trade({ status: "completed", endedAt: at(-DAY) }),
        trade({ status: "failed", endedAt: at(-DAY) }),
        trade({ status: "cancelled", endedAt: at(-DAY) }),
      ]),
    ).toEqual([]);
  });

  test("a trade ends by 14 days after accept", () => {
    const acceptedAt = new Date("2026-10-01T09:00:00Z");
    expect(blockersOf([trade({ acceptedAt })])).toEqual([
      {
        kind: "trade",
        tradeId: 1042,
        partnerId: "kaede",
        cancelLocked: false,
        endsBy: new Date("2026-10-15T09:00:00Z"),
      },
    ]);
  });

  test("a verified leg or a held copy locks cancelling", () => {
    const locked = (overrides: Partial<DeletionTrade>) =>
      blockersOf([trade(overrides)]).map((b) => b.kind === "trade" && b.cancelLocked);
    expect(locked({})).toEqual([false]);
    expect(locked({ verifiedLegs: 1 })).toEqual([true]);
    expect(locked({ heldCopies: 1 })).toEqual([true]);
  });

  test("a lagging indexer reads as Cancel available", () => {
    expect(cancelRefusal(trade(), true, 0)).toBe("indexer_behind");
    expect(blockersOf([trade()])).toEqual([expect.objectContaining({ cancelLocked: false })]);
  });
});

test("blockers sort by their end", () => {
  const blockers = blockersOf(
    [trade({ id: 2, acceptedAt: at(-DAY) }), trade({ id: 1, acceptedAt: at(-10 * DAY) })],
    [sanction({ expiresAt: at(2 * DAY) })],
  );
  expect(blockers.map((b) => (b.kind === "trade" ? b.tradeId : b.type))).toEqual([
    "chat_mute",
    1,
    2,
  ]);
});

test("refusalOf prefers sanctioned", () => {
  expect(refusalOf(blockersOf([trade()], [sanction()]))).toBe("sanctioned");
  expect(refusalOf(blockersOf([trade()]))).toBe("trade_in_progress");
  expect(refusalOf([])).toBeNull();
});

test("placeholder addresses are undeliverable", () => {
  expect(hasDeliverableEmail("123@discord.placeholder.local")).toBe(false);
  expect(hasDeliverableEmail("456@twitter.placeholder.invalid")).toBe(false);
  expect(hasDeliverableEmail("abc@deleted.invalid")).toBe(false);
  expect(hasDeliverableEmail("rin@example.com")).toBe(true);
});

describe("deletionStep", () => {
  const placeholder = "123@discord.placeholder.local";

  test("deletes within 10 minutes of signing in, then asks to sign in again", () => {
    expect(deletionStep(placeholder, at(-(10 * MINUTE - 1000)), NOW)).toBe("delete");
    expect(deletionStep(placeholder, at(-10 * MINUTE), NOW)).toBe("sign-in-again");
  });

  test("a deliverable address sends the email whatever the session's age", () => {
    expect(deletionStep("rin@example.com", NOW, NOW)).toBe("send-email");
    expect(deletionStep("rin@example.com", at(-30 * DAY), NOW)).toBe("send-email");
  });
});
