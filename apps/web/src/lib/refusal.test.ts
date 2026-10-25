import { describe, expect, test } from "bun:test";

import { ORPCError } from "@orpc/client";

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

  test("falls back for a reason this build does not know", () => {
    const error = new ORPCError("BAD_REQUEST", { data: { reason: "from_the_future" } });
    expect(refusalText(error)).toBe(m.api_errors_unknown());
  });

  test("falls back for an error that is not an oRPC refusal", () => {
    expect(refusalText(new Error("boom"))).toBe(m.api_errors_unknown());
  });
});
