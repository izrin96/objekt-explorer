import { describe, expect, test } from "bun:test";

import { busyReport, routeKey, stallReport } from "./stall-report";

describe("stallReport", () => {
  test("lists requests oldest first with their age", () => {
    const line = stallReport(
      342.6,
      [
        { label: "POST /rpc/presence/active", startedAt: 900 },
        { label: "GET /@abc/trades", startedAt: 100 },
      ],
      1000,
    );
    expect(line).toBe(
      "[loop] blocked 343 ms; in flight: GET /@abc/trades (900 ms), POST /rpc/presence/active (100 ms)",
    );
  });

  test("caps the list and counts the rest", () => {
    const running = Array.from({ length: 7 }, (_, i) => ({
      label: `GET /${String(i)}`,
      startedAt: i,
    }));
    expect(stallReport(150, running, 10)).toBe(
      "[loop] blocked 150 ms; in flight: GET /0 (10 ms), GET /1 (9 ms), GET /2 (8 ms), GET /3 (7 ms), GET /4 (6 ms), and 2 more",
    );
  });

  test("says when nothing was in flight", () => {
    expect(stallReport(120, [], 0)).toBe("[loop] blocked 120 ms; in flight: no request in flight");
  });
});

describe("routeKey", () => {
  test("collapses addresses and profile handles", () => {
    expect(
      routeKey("GET", "/api/v1/objekts/owned-copies/0xd221E6Adf884B8f50f02e175AFEc5cFE175699f7"),
    ).toBe("GET /api/v1/objekts/owned-copies/:address");
    expect(routeKey("GET", "/@izrin96/trades")).toBe("GET /@:handle/trades");
    expect(routeKey("POST", "/rpc/presence/active")).toBe("POST /rpc/presence/active");
  });

  test("keeps only an auth path's endpoint, never what follows it", () => {
    expect(routeKey("GET", "/api/auth/reset-password/a1b2c3secret")).toBe(
      "GET /api/auth/reset-password/…",
    );
    expect(routeKey("POST", "/api/auth/sign-in/email")).toBe("POST /api/auth/sign-in/…");
    expect(routeKey("GET", "/api/auth/get-session")).toBe("GET /api/auth/get-session");
  });
});

describe("busyReport", () => {
  test("lists the most frequent routes first", () => {
    const routes = new Map([
      ["GET /@:handle", 3],
      ["GET /api/v1/collections", 9],
      ["POST /rpc/status/get", 1],
    ]);
    expect(busyReport(0.854, 10_000, routes)).toBe(
      "[loop] CPU 85% over the last 10 s; requests: 9× GET /api/v1/collections, 3× GET /@:handle, 1× POST /rpc/status/get",
    );
  });

  test("says when no request came in", () => {
    expect(busyReport(0.9, 10_000, new Map())).toBe(
      "[loop] CPU 90% over the last 10 s; requests: none",
    );
  });
});
