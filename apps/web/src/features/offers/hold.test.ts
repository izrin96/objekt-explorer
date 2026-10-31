import { describe, expect, test } from "bun:test";

import { m } from "@/paraglide/messages";

import { HOLD_MS, holdLine, holdNotice, withHold, withoutHold } from "./hold";

describe("hold wording", () => {
  test("the notice names each action", () => {
    expect(holdNotice("decline")).toBe(m.offer_toast_declined());
    expect(holdNotice("withdraw")).toBe(m.offer_toast_withdrawn());
  });

  test("the pending line names each action", () => {
    expect(holdLine("decline")).toBe(m.offer_declining());
    expect(holdLine("withdraw")).toBe(m.offer_withdrawing());
  });

  test("the hold lasts five seconds", () => {
    expect(HOLD_MS).toBe(5000);
  });
});

describe("hold transitions", () => {
  test("withHold adds one offer and leaves the others", () => {
    const before = { 1: "decline" } as const;
    expect(withHold(before, 2, "withdraw")).toEqual({ 1: "decline", 2: "withdraw" });
    expect(before).toEqual({ 1: "decline" });
  });

  test("withoutHold removes one offer and leaves the others", () => {
    const before = { 1: "decline", 2: "withdraw" } as const;
    expect(withoutHold(before, 1)).toEqual({ 2: "withdraw" });
    expect(before).toEqual({ 1: "decline", 2: "withdraw" });
  });

  test("withoutHold of an offer not held changes nothing", () => {
    expect(withoutHold({ 1: "decline" }, 9)).toEqual({ 1: "decline" });
  });
});
