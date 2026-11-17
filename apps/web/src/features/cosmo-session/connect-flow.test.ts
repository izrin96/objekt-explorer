import { describe, expect, test } from "bun:test";

import {
  clockTick,
  codeInput,
  expiryNotice,
  type FlowState,
  isPolling,
  minting,
  parseCode,
  pollRefused,
  pollResult,
  refused,
  remaining,
  retryLabel,
  started,
  submitting,
} from "./connect-flow";

const QR = "cosmo://ticket-login?t=abc";
const qr: FlowState = { kind: "qr", qr: QR, expiresAt: 180_000 };
const code: FlowState = { kind: "code", nickname: "rin.t", codeExpiresAt: 60_000 };

describe("remaining", () => {
  test("formats m:ss", () => {
    expect(remaining(180_000, 0)).toBe("3:00");
    expect(remaining(65_000, 0)).toBe("1:05");
    expect(remaining(9_000, 0)).toBe("0:09");
  });

  test("rounds up so 0:00 only shows at expiry", () => {
    expect(remaining(179_200, 0)).toBe("3:00");
    expect(remaining(200, 0)).toBe("0:01");
  });

  test("clamps at 0:00", () => {
    expect(remaining(1_000, 5_000)).toBe("0:00");
    expect(remaining(5_000, 5_000)).toBe("0:00");
  });
});

describe("codeInput and parseCode", () => {
  test("keeps digits only, at most 2", () => {
    expect(codeInput("4a")).toBe("4");
    expect(codeInput("a b")).toBe("");
    expect(codeInput("472")).toBe("47");
    expect(codeInput("0 7")).toBe("07");
  });

  test("a code of fewer than 2 digits is not sent; 07 is 7", () => {
    expect(parseCode("")).toBeNull();
    expect(parseCode("4")).toBeNull();
    expect(parseCode("47")).toBe(47);
    expect(parseCode("07")).toBe(7);
    expect(parseCode("4a")).toBeNull();
  });
});

describe("transitions", () => {
  test("minting then the ticket", () => {
    expect(minting()).toEqual({ kind: "minting" });
    expect(started({ qr: QR, expiresAt: 5, expiresInMs: 180_000 }, 1000)).toEqual({
      kind: "qr",
      qr: QR,
      expiresAt: 181_000,
    });
  });

  test("a poll moves qr to code and keeps the ticket's code", () => {
    const poll = {
      state: "code",
      nickname: "rin.t",
      codeExpiresAt: 9,
      codeExpiresInMs: 50_000,
    } as const;
    expect(pollResult(qr, poll, 10_000)).toEqual({
      kind: "code",
      nickname: "rin.t",
      codeExpiresAt: 60_000,
    });
    expect(
      pollResult(qr, { state: "waiting", expiresAt: 1, expiresInMs: 160_000 }, 10_000),
    ).toEqual({ kind: "qr", qr: QR, expiresAt: 170_000 });
    expect(pollResult(qr, { state: "expired" }, 0)).toEqual({ kind: "expired" });
    expect(pollResult(code, { state: "expired" }, 0)).toEqual({ kind: "expired" });
  });

  test("the deadline counts from the viewer's receive time, whatever the server's clock says", () => {
    // the server's absolute time is an hour off; only the remaining milliseconds are used
    const skewed = { state: "waiting", expiresAt: 9_999_999_999, expiresInMs: 30_000 } as const;
    expect(pollResult(qr, skewed, 500_000)).toEqual({ ...qr, expiresAt: 530_000 });
  });

  test("a poll does not pull a code step back to waiting", () => {
    expect(pollResult(code, { state: "waiting", expiresAt: 1, expiresInMs: 1 }, 0)).toBe(code);
  });

  test("a poll after the attempt ended changes nothing", () => {
    const done: FlowState = { kind: "connected", nickname: "rin.t" };
    expect(pollResult(done, { state: "expired" }, 0)).toBe(done);
    const sub = submitting(code);
    expect(pollResult(sub, { state: "expired" }, 0)).toBe(sub);
  });

  test("a failed poll keeps the state, except an expired ticket", () => {
    expect(pollRefused(qr, "user_rate_limit")).toBe(qr);
    expect(pollRefused(qr, null)).toBe(qr);
    expect(pollRefused(qr, "cosmo_session_expired")).toEqual({ kind: "expired" });
  });

  test("the clock ends a waiting or code step at its expiry", () => {
    expect(clockTick(qr, 179_999)).toBe(qr);
    expect(clockTick(qr, 180_000)).toEqual({ kind: "expired" });
    expect(clockTick(code, 60_000)).toEqual({ kind: "expired" });
    const wrong: FlowState = { kind: "wrongCode", nickname: "rin.t", codeExpiresAt: 60_000 };
    expect(clockTick(wrong, 61_000)).toEqual({ kind: "expired" });
  });

  test("the clock never ends a submit in flight", () => {
    const sub = submitting(code);
    expect(clockTick(sub, 999_999)).toBe(sub);
  });

  test("submitting only from a code step", () => {
    expect(submitting(code)).toEqual({
      kind: "submitting",
      nickname: "rin.t",
      codeExpiresAt: 60_000,
    });
    expect(submitting(qr)).toBe(qr);
  });
});

describe("refusals", () => {
  test("a wrong code returns to the code step with its time", () => {
    expect(refused(submitting(code), "cosmo_session_wrong_code")).toEqual({
      kind: "wrongCode",
      nickname: "rin.t",
      codeExpiresAt: 60_000,
    });
  });

  test("a second wrong code stays a wrong code", () => {
    const wrong = refused(submitting(code), "cosmo_session_wrong_code");
    expect(refused(submitting(wrong), "cosmo_session_wrong_code").kind).toBe("wrongCode");
  });

  test.each([
    ["cosmo_session_expired", "expired"],
    ["cosmo_session_cosmo_error", "cosmoError"],
    ["cosmo_session_unavailable", "unavailable"],
    ["cosmo_session_captcha", "unavailable"],
    ["cosmo_session_busy", "busy"],
    ["cosmo_session_limit", "limit"],
    ["cosmo_session_not_allowed", "notAllowed"],
    ["user_rate_limit", "rateLimited"],
  ] as const)("%s ends in %s", (reason, kind) => {
    expect(refused(minting(), reason).kind).toBe(kind);
  });

  test("a third wrong code arrives as expired and ends the attempt", () => {
    expect(refused(submitting(code), "cosmo_session_expired")).toEqual({ kind: "expired" });
  });

  test("an unknown failure: unavailable before a ticket, a Cosmo error once a code was sent", () => {
    expect(refused(minting(), null).kind).toBe("unavailable");
    expect(refused(submitting(code), null).kind).toBe("cosmoError");
    expect(refused(minting(), "something_else").kind).toBe("unavailable");
  });
});

describe("polling and retry", () => {
  test("polls only while waiting for a scan or a code", () => {
    expect(isPolling(qr)).toBe(true);
    expect(isPolling(code)).toBe(true);
    expect(isPolling({ kind: "wrongCode", nickname: null, codeExpiresAt: 1 })).toBe(true);
    for (const state of [
      minting(),
      submitting(code),
      { kind: "connected", nickname: "x" },
      { kind: "expired" },
      { kind: "cosmoError" },
      { kind: "unavailable" },
      { kind: "busy" },
      { kind: "limit" },
      { kind: "notAllowed" },
      { kind: "rateLimited" },
    ] satisfies FlowState[]) {
      expect(isPolling(state)).toBe(false);
    }
  });

  test("retry wording", () => {
    expect(retryLabel({ kind: "expired" })).toBe("new");
    expect(retryLabel({ kind: "cosmoError" })).toBe("again");
    expect(retryLabel({ kind: "busy" })).toBe("again");
    expect(retryLabel({ kind: "limit" })).toBeNull();
    expect(retryLabel({ kind: "notAllowed" })).toBeNull();
    expect(retryLabel(qr)).toBeNull();
  });
});

describe("expiryNotice", () => {
  const DAY = 86_400_000;
  const now = Date.parse("2026-11-17T12:00:00Z");

  test("nothing until fewer than 14 days remain", () => {
    expect(expiryNotice(now + 14 * DAY, now)).toBeNull();
    expect(expiryNotice(now + 100 * DAY, now)).toBeNull();
  });

  test("whole days left, rounded down", () => {
    expect(expiryNotice(now + 14 * DAY - 1, now)).toBe(13);
    expect(expiryNotice(now + 3 * DAY + 5_000, now)).toBe(3);
    expect(expiryNotice(now + DAY, now)).toBe(1);
  });

  test("the last day is 0, which reads as today", () => {
    expect(expiryNotice(now + DAY - 1, now)).toBe(0);
    expect(expiryNotice(now + 1, now)).toBe(0);
  });

  test("an ended session has no notice: its row says signed out", () => {
    expect(expiryNotice(now, now)).toBeNull();
    expect(expiryNotice(now - DAY, now)).toBeNull();
  });
});
