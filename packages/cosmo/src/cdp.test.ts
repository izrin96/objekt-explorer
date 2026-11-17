import { describe, expect, test } from "bun:test";

import { createCommandEncoder, matchReply, renderKeyFrom } from "./cdp";

describe("createCommandEncoder", () => {
  test("numbers commands from 1 and carries method, params and session", () => {
    const encode = createCommandEncoder();
    const a = encode("Target.createTarget", { url: "about:blank" });
    const b = encode("Page.navigate", { url: "https://x.test" }, "S1");
    expect([a.id, b.id]).toEqual([1, 2]);
    expect(JSON.parse(a.frame)).toEqual({
      id: 1,
      method: "Target.createTarget",
      params: { url: "about:blank" },
    });
    expect(JSON.parse(b.frame).sessionId).toBe("S1");
  });

  test("counters are independent per encoder", () => {
    expect(createCommandEncoder()("A").id).toBe(1);
    expect(createCommandEncoder()("A").id).toBe(1);
  });
});

describe("matchReply", () => {
  const event = JSON.stringify({ method: "Page.loadEventFired", params: {}, sessionId: "S1" });

  test("skips events and returns the reply with its id", () => {
    expect(matchReply(event, 3, "S1")).toBeNull();
    const reply = JSON.stringify({ id: 3, sessionId: "S1", result: { ok: true } });
    expect(matchReply(reply, 3, "S1")?.result).toEqual({ ok: true });
  });

  test("ignores another id or another session", () => {
    const reply = JSON.stringify({ id: 3, sessionId: "S1", result: {} });
    expect(matchReply(reply, 4, "S1")).toBeNull();
    expect(matchReply(reply, 3, "S2")).toBeNull();
    expect(matchReply(reply, 3)).toBeNull();
  });

  test("a browser-level reply has no session", () => {
    const reply = JSON.stringify({ id: 1, result: { targetId: "T" } });
    expect(matchReply(reply, 1)?.result).toEqual({ targetId: "T" });
    expect(matchReply(reply, 1, "S1")).toBeNull();
  });

  test("returns an error reply as is", () => {
    const reply = JSON.stringify({ id: 2, error: { code: -32000, message: "no" } });
    expect(matchReply(reply, 2)?.error?.message).toBe("no");
  });

  test("not JSON or not an object is null", () => {
    expect(matchReply("nope", 1)).toBeNull();
    expect(matchReply("null", 1)).toBeNull();
    expect(matchReply("7", 1)).toBeNull();
  });
});

describe("renderKeyFrom", () => {
  const api = "https://www.google.com/recaptcha/api.js?render=KEY_A";

  test("zero scripts", () => {
    expect(renderKeyFrom([])).toBeNull();
    expect(renderKeyFrom(["https://shop.cosmo.fans/_next/app.js", "", "not a url"])).toBeNull();
  });

  test("one script", () => {
    expect(renderKeyFrom(["https://shop.cosmo.fans/app.js", api])).toBe("KEY_A");
  });

  test("two scripts: the first with a key", () => {
    const enterprise = "https://www.google.com/recaptcha/enterprise.js?render=KEY_B";
    expect(renderKeyFrom([api, enterprise])).toBe("KEY_A");
    expect(
      renderKeyFrom(["https://www.google.com/recaptcha/api.js?render=explicit", enterprise]),
    ).toBe("KEY_B");
  });

  test("a render parameter outside recaptcha is not a key", () => {
    expect(renderKeyFrom(["https://shop.cosmo.fans/app.js?render=nope"])).toBeNull();
  });
});
