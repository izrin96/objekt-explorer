import { describe, expect, test } from "bun:test";

import { listConversationsInputSchema, messageBodySchema, sendInputSchema } from "./chat";

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

describe("cursor at", () => {
  test.each([
    // as Postgres wrote them in a list response
    "2026-10-12 17:55:32.071176+00",
    "2026-10-10 21:17:47.617444+00",
    "2026-10-01 12:00:00+00",
    "2026-10-01 12:00:00.123456+00",
    "2026-10-01 12:00:00.5+09",
    "2026-10-01 12:00:00+05:30",
    "2026-10-01T12:00:00.000Z".replace("Z", "+00"),
  ])("accepts %s", (at) => {
    expect(listConversationsInputSchema.safeParse({ cursor: { at, id: 1 } }).success).toBe(true);
  });

  test.each(["", "yesterday", "2026-10-01; DROP TABLE x", "2026-10-01 12:00:00\0+00"])(
    "refuses %j",
    (at) => {
      expect(listConversationsInputSchema.safeParse({ cursor: { at, id: 1 } }).success).toBe(false);
    },
  );
});

describe("message body", () => {
  test("keeps text, trims it, and refuses blank-rendering input", () => {
    expect(messageBodySchema.parse("  hi ")).toBe("hi");
    for (const body of ["​​", "⠀", "ㅤ ᅟᅠﾠ", "a\0b", "   "]) {
      expect(messageBodySchema.safeParse(body).success).toBe(false);
    }
    expect(messageBodySchema.safeParse("a​b").success).toBe(true);
  });

  test("the refusal reads as the existing empty error", () => {
    const result = sendInputSchema.safeParse({ conversationId: 1, body: "​" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("empty");
  });
});

describe("send input", () => {
  test("an old tab's input without clientId still validates", () => {
    expect(sendInputSchema.parse({ conversationId: 1, body: "hi" })).toEqual({
      conversationId: 1,
      body: "hi",
    });
  });

  test("clientId must be a uuid", () => {
    const clientId = "0b1c6f0e-5c1f-4d3e-9a3e-7f9d2a1b4c5d";
    expect(sendInputSchema.safeParse({ conversationId: 1, body: "hi", clientId }).success).toBe(
      true,
    );
    expect(
      sendInputSchema.safeParse({ conversationId: 1, body: "hi", clientId: "x" }).success,
    ).toBe(false);
  });

  test("card slugs refuse NUL", () => {
    expect(
      sendInputSchema.safeParse({ conversationId: 1, card: { collectionSlug: "a\0b" } }).success,
    ).toBe(false);
    expect(
      sendInputSchema.safeParse({ conversationId: 1, card: { collectionSlug: "seoyeon-204z" } })
        .success,
    ).toBe(true);
  });
});
