import { describe, expect, test } from "bun:test";

import { ORPCError } from "@orpc/client";

import { relativeTime } from "@/lib/time";
import { m } from "@/paraglide/messages";

import { refusalText } from "./refusal";

describe("refusalText", () => {
  test("translates a known reason, whatever the message says", () => {
    const error = new ORPCError("BAD_REQUEST", {
      message: "English only",
      data: { reason: "list_have_links_want" },
    });
    expect(refusalText(error)).toBe(m.api_errors_list_have_links_want());
  });

  test("fills user_failed_get_info with its provider", () => {
    const error = new ORPCError("BAD_REQUEST", {
      data: { reason: "user_failed_get_info", provider: "Discord" },
    });
    expect(refusalText(error)).toBe(m.api_errors_user_failed_get_info({ provider: "Discord" }));
    expect(refusalText(error)).toContain("Discord");
  });

  test("names when the next bump opens, or says the bump failed without a time", () => {
    const at = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString();
    const tooSoon = new ORPCError("TOO_MANY_REQUESTS", {
      data: { reason: "trade_bump_too_soon", retryAt: at, nextBumpAt: at },
    });
    expect(refusalText(tooSoon)).toBe(
      m.trade_bump_too_soon({ time: relativeTime(new Date(at).getTime(), Date.now(), "hour") }),
    );
    const noTime = new ORPCError("TOO_MANY_REQUESTS", { data: { reason: "trade_bump_too_soon" } });
    expect(refusalText(noTime)).toBe(m.trade_bump_error());
  });

  test("falls back for a reason this build does not know", () => {
    const error = new ORPCError("BAD_REQUEST", { data: { reason: "from_the_future" } });
    expect(refusalText(error)).toBe(m.api_errors_unknown());
  });

  test("falls back for an error that is not an oRPC refusal", () => {
    expect(refusalText(new Error("boom"))).toBe(m.api_errors_unknown());
  });
});
