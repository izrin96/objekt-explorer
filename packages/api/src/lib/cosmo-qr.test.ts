import { describe, expect, test } from "bun:test";

import {
  certifyOutcome,
  codeDeadline,
  countWrongCode,
  MAX_WRONG_CODES,
  connectAllowed,
  connectBlocked,
  cookieExpiry,
  logoutConfirmed,
  pollFallback,
  pollState,
  startRefusal,
  withRemaining,
} from "./cosmo-qr";

const now = 1_000_000;

describe("pollState", () => {
  test("wait_for_user_action is waiting until the ticket runs out", () => {
    expect(pollState({ status: "wait_for_user_action", ticketRemainingMs: 90_000 }, now)).toEqual({
      state: "waiting",
      expiresAt: now + 90_000,
    });
  });

  test("wait_for_certify is code, ending with the code's own time", () => {
    expect(
      pollState(
        {
          status: "wait_for_certify",
          ticketRemainingMs: 100_000,
          ticketOtpRemainingMs: 60_000,
          nickname: "someone",
        },
        now,
      ),
    ).toEqual({ state: "code", nickname: "someone", codeExpiresAt: now + 60_000 });
  });

  test("an unknown status is expired", () => {
    expect(pollState({ status: "unknown" }, now)).toEqual({ state: "expired" });
  });

  test("certified is not terminal: it says nothing, so the last state stands until certify ends it", () => {
    expect(pollState({ status: "certified" }, now)).toBeNull();
  });

  test("a remaining time of 0 or less is expired", () => {
    expect(pollState({ status: "wait_for_user_action", ticketRemainingMs: 0 }, now)).toEqual({
      state: "expired",
    });
    expect(pollState({ status: "wait_for_user_action", ticketRemainingMs: -5 }, now)).toEqual({
      state: "expired",
    });
  });

  test("a code whose own time ran out is expired even when the ticket has time", () => {
    expect(
      pollState(
        {
          status: "wait_for_certify",
          ticketRemainingMs: 50_000,
          ticketOtpRemainingMs: 0,
          nickname: null,
        },
        now,
      ),
    ).toEqual({ state: "expired" });
  });
});

describe("certifyOutcome", () => {
  test("a refusal while the code time remains is wrong_code", () => {
    expect(certifyOutcome("refused", now + 1, now)).toBe("wrong_code");
  });

  test("a refusal once the code time has passed is expired", () => {
    expect(certifyOutcome("refused", now, now)).toBe("expired");
    expect(certifyOutcome("refused", now - 1, now)).toBe("expired");
  });

  test("a refusal with no code time known is expired", () => {
    expect(certifyOutcome("refused", null, now)).toBe("expired");
  });

  test("a dead answer reads as a refusal", () => {
    expect(certifyOutcome("dead", now + 1, now)).toBe("wrong_code");
  });

  test("unavailable, busy and unexpected are cosmo_error, whatever the time", () => {
    for (const kind of ["unavailable", "busy", "unexpected"] as const) {
      expect(certifyOutcome(kind, now + 1, now)).toBe("cosmo_error");
      expect(certifyOutcome(kind, now - 1, now)).toBe("cosmo_error");
    }
  });
});

describe("connectAllowed", () => {
  test("an address already among the user's is allowed at the limit", () => {
    expect(connectAllowed(["0xa", "0xb", "0xc"], "0xB")).toBe(true);
  });

  test("a new address is allowed below 3", () => {
    expect(connectAllowed([], "0xa")).toBe(true);
    expect(connectAllowed(["0xb", "0xc"], "0xa")).toBe(true);
  });

  test("a new address is refused at 3", () => {
    expect(connectAllowed(["0xb", "0xc", "0xd"], "0xa")).toBe(false);
  });

  test("max can be passed", () => {
    expect(connectAllowed(["0xb"], "0xa", 1)).toBe(false);
  });
});

describe("cookieExpiry", () => {
  const day = 86_400_000;
  test("Cosmo's earlier expiry wins", () => {
    expect(cookieExpiry(new Date(now + 10 * day), now).getTime()).toBe(now + 10 * day);
  });
  test("a 4-year expiry is clamped to 180 days", () => {
    expect(cookieExpiry(new Date(now + 1460 * day), now).getTime()).toBe(now + 180 * day);
  });
  test("null or invalid is ignored", () => {
    expect(cookieExpiry(null, now).getTime()).toBe(now + 180 * day);
    expect(cookieExpiry(new Date(Number.NaN), now).getTime()).toBe(now + 180 * day);
  });
});

describe("pollFallback", () => {
  test("keeps the last live state", () => {
    const last = { state: "code", nickname: "rin.t", codeExpiresAt: now + 5000 } as const;
    expect(pollFallback(last, now + 60_000, now)).toEqual(last);
  });
  test("expires a state past its own deadline", () => {
    expect(pollFallback({ state: "waiting", expiresAt: now - 1 }, now + 60_000, now)).toEqual({
      state: "expired",
    });
    expect(
      pollFallback({ state: "code", nickname: "a", codeExpiresAt: now }, now + 60_000, now),
    ).toEqual({ state: "expired" });
  });
  test("expires once the ticket is over", () => {
    expect(pollFallback({ state: "waiting", expiresAt: now + 1 }, now, now)).toEqual({
      state: "expired",
    });
  });
  test("no last state reads as waiting", () => {
    expect(pollFallback(null, now + 9000, now)).toEqual({
      state: "waiting",
      expiresAt: now + 9000,
    });
  });
});

describe("startRefusal", () => {
  test("maps each kind", () => {
    expect(startRefusal("busy")).toBe("cosmo_session_busy");
    expect(startRefusal("refused")).toBe("cosmo_session_captcha");
    expect(startRefusal("unavailable")).toBe("cosmo_session_unavailable");
    expect(startRefusal("unexpected")).toBe("cosmo_session_unavailable");
  });
});

describe("connectBlocked", () => {
  const ok = { banned: false, banExpires: null, deletedAt: null };
  test("allows a plain user", () => expect(connectBlocked(ok, now)).toBe(false));
  test("blocks a deleted user", () =>
    expect(connectBlocked({ ...ok, deletedAt: new Date(now) }, now)).toBe(true));
  test("blocks a permanent or running ban", () => {
    expect(connectBlocked({ ...ok, banned: true }, now)).toBe(true);
    expect(connectBlocked({ ...ok, banned: true, banExpires: new Date(now + 1) }, now)).toBe(true);
  });
  test("a lapsed ban does not block", () =>
    expect(connectBlocked({ ...ok, banned: true, banExpires: new Date(now - 1) }, now)).toBe(
      false,
    ));
});

describe("logoutConfirmed", () => {
  test("ok and a dead answer confirm; a firewall block does not", () => {
    expect(logoutConfirmed({ ok: true })).toBe(true);
    expect(logoutConfirmed({ ok: false, kind: "dead" })).toBe(true);
    expect(logoutConfirmed({ ok: false, kind: "unavailable" })).toBe(false);
    expect(logoutConfirmed({ ok: false, kind: "refused" })).toBe(false);
  });
});

describe("codeDeadline", () => {
  test("the code's own time when the last state was code", () => {
    const last = { state: "code", nickname: null, codeExpiresAt: now + 5 } as const;
    expect(codeDeadline(last, now + 99)).toBe(now + 5);
  });
  test("otherwise the ticket's own expiry, so a first code before any poll is not expired", () => {
    expect(codeDeadline(null, now + 99)).toBe(now + 99);
    expect(codeDeadline({ state: "waiting", expiresAt: now + 1 }, now + 99)).toBe(now + 99);
  });
  test("feeds certifyOutcome: wrong while the ticket lives, expired after", () => {
    expect(certifyOutcome("refused", codeDeadline(null, now + 99), now)).toBe("wrong_code");
    expect(certifyOutcome("refused", codeDeadline(null, now), now)).toBe("expired");
  });
});

describe("countWrongCode", () => {
  test("starts at 1 for a ticket with no count", () => {
    expect(countWrongCode({})).toEqual({ wrong: 1, over: false });
  });
  test("the third wrong code ends the attempt", () => {
    expect(MAX_WRONG_CODES).toBe(3);
    expect(countWrongCode({ wrong: 1 })).toEqual({ wrong: 2, over: false });
    expect(countWrongCode({ wrong: 2 })).toEqual({ wrong: 3, over: true });
  });
});

describe("withRemaining", () => {
  test("a waiting state carries the milliseconds left, from the server's clock", () => {
    expect(withRemaining({ state: "waiting", expiresAt: now + 90_000 }, now)).toEqual({
      state: "waiting",
      expiresAt: now + 90_000,
      expiresInMs: 90_000,
    });
  });

  test("a code state carries codeExpiresInMs", () => {
    expect(
      withRemaining({ state: "code", nickname: "a", codeExpiresAt: now + 40_000 }, now),
    ).toEqual({
      state: "code",
      nickname: "a",
      codeExpiresAt: now + 40_000,
      codeExpiresInMs: 40_000,
    });
  });

  test("a deadline already past gives 0, never a negative", () => {
    expect(withRemaining({ state: "waiting", expiresAt: now - 5 }, now)).toMatchObject({
      expiresInMs: 0,
    });
  });

  test("expired has no time", () => {
    expect(withRemaining({ state: "expired" }, now)).toEqual({ state: "expired" });
  });
});
