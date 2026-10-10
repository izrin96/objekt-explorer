import { describe, expect, test } from "bun:test";

import { listConversationsInputSchema } from "./chat";

describe("listConversationsInputSchema", () => {
  test("the inputs a tab opened before the context field sends still validate", () => {
    expect(listConversationsInputSchema.parse({})).toEqual({ box: "inbox" });
    expect(listConversationsInputSchema.parse({ box: "archived" })).toEqual({ box: "archived" });
    const cursor = { at: "2026-10-01 12:00:00+00", id: 7 };
    expect(listConversationsInputSchema.parse({ box: "requests", cursor })).toEqual({
      box: "requests",
      cursor,
    });
  });
});
