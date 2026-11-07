import { describe, expect, test } from "bun:test";

import type { Notification } from "@repo/api/schemas/notification";
import { fromAny, fromPartial } from "@total-typescript/shoehorn";

import { notificationTone } from "./tone";

type OfferEvent = Extract<Notification, { type: "offer" }>["payload"]["event"];
type TradeEvent = Extract<Notification, { type: "trade" }>["payload"]["event"];

const offer = (event: OfferEvent): Notification =>
  fromPartial({ type: "offer", payload: { event } });
const trade = (event: TradeEvent): Notification =>
  fromPartial({ type: "trade", payload: { event } });

describe("notificationTone", () => {
  test("verified, completed and accepted are a green check", () => {
    for (const n of [trade("leg_verified"), trade("completed"), offer("accepted")]) {
      expect(notificationTone(n)).toEqual({ icon: "check", tone: "success" });
    }
  });

  test("a stall reminder is an amber clock", () => {
    expect(notificationTone(trade("reminder"))).toEqual({ icon: "clock", tone: "warning" });
    expect(notificationTone(trade("stuck"))).toEqual({ icon: "clock", tone: "warning" });
  });

  test("a wrong copy sent is an amber warning sign, and declined stays neutral", () => {
    expect(notificationTone(trade("wrong_copy"))).toEqual({ icon: "warning", tone: "warning" });
    expect(notificationTone(trade("wrong_copy_declined"))).toEqual({
      icon: "arrow",
      tone: "neutral",
    });
  });

  test("a request to cancel is an amber warning sign, and its decline stays neutral", () => {
    expect(notificationTone(trade("cancel_asked"))).toEqual({ icon: "warning", tone: "warning" });
    expect(notificationTone(trade("cancel_declined"))).toEqual({ icon: "arrow", tone: "neutral" });
  });

  test("a wrong copy due tomorrow is an amber clock", () => {
    expect(notificationTone(trade("wrong_copy_due"))).toEqual({ icon: "clock", tone: "warning" });
  });

  test("a wrong copy accepted automatically is a green check", () => {
    expect(notificationTone(trade("wrong_copy_auto_accepted"))).toEqual({
      icon: "check",
      tone: "success",
    });
  });

  test("cancelled, failed and expired are a red cross", () => {
    for (const n of [trade("cancelled"), trade("failed"), offer("cancelled"), offer("expired")]) {
      expect(notificationTone(n)).toEqual({ icon: "cross", tone: "destructive" });
    }
  });

  test("a received or countered offer is an indigo arrow", () => {
    for (const n of [offer("received"), offer("countered")]) {
      expect(notificationTone(n)).toEqual({ icon: "arrow", tone: "progress" });
    }
  });

  test("a declined or withdrawn offer stays neutral", () => {
    for (const n of [offer("declined"), offer("withdrawn")]) {
      expect(notificationTone(n)).toEqual({ icon: "arrow", tone: "neutral" });
    }
  });

  test("alerts take their list type's colour", () => {
    expect(
      notificationTone(fromPartial<Notification>({ type: "want_match", payload: {} })),
    ).toEqual({
      icon: "heart",
      tone: "want",
    });
    expect(
      notificationTone(fromPartial<Notification>({ type: "have_wanted", payload: {} })),
    ).toEqual({
      icon: "package",
      tone: "have",
    });
  });

  test("a sanction is a red shield", () => {
    expect(notificationTone(fromPartial<Notification>({ type: "sanction", payload: {} }))).toEqual({
      icon: "shield",
      tone: "destructive",
    });
  });

  test("a lifted sanction is a green shield", () => {
    for (const action of ["chat_mute_lifted", "trade_block_lifted"] as const) {
      expect(
        notificationTone(fromPartial<Notification>({ type: "sanction", payload: { action } })),
      ).toEqual({ icon: "shield", tone: "success" });
    }
  });

  test("an event a newer server sends stays neutral", () => {
    expect(
      notificationTone(fromAny({ type: "offer", payload: { event: "something_new" } })),
    ).toEqual({ icon: "arrow", tone: "neutral" });
  });
});
