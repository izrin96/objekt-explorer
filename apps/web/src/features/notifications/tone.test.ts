import { describe, expect, test } from "bun:test";

import { notificationTone } from "./tone";

const offer = (event: string) => ({ type: "offer", payload: { event } }) as never;
const trade = (event: string) => ({ type: "trade", payload: { event } }) as never;

describe("notificationTone", () => {
  test("verified, completed and accepted are a green check", () => {
    for (const n of [trade("leg_verified"), trade("completed"), offer("accepted")]) {
      expect(notificationTone(n)).toEqual({ icon: "check", tone: "success" });
    }
  });

  test("a stall reminder is an amber clock", () => {
    expect(notificationTone(trade("reminder"))).toEqual({ icon: "clock", tone: "warning" });
  });

  test("a wrong copy sent is an amber warning sign, and declined stays neutral", () => {
    expect(notificationTone(trade("wrong_copy"))).toEqual({ icon: "warning", tone: "warning" });
    expect(notificationTone(trade("wrong_copy_declined"))).toEqual({
      icon: "arrow",
      tone: "neutral",
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
    expect(notificationTone({ type: "want_match", payload: {} } as never)).toEqual({
      icon: "heart",
      tone: "want",
    });
    expect(notificationTone({ type: "have_wanted", payload: {} } as never)).toEqual({
      icon: "package",
      tone: "have",
    });
  });

  test("a sanction is a red shield", () => {
    expect(notificationTone({ type: "sanction", payload: {} } as never)).toEqual({
      icon: "shield",
      tone: "destructive",
    });
  });

  test("an event a newer server sends stays neutral", () => {
    expect(notificationTone(offer("something_new"))).toEqual({ icon: "arrow", tone: "neutral" });
  });
});
