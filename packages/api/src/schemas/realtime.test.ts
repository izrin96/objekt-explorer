import { describe, expect, test } from "bun:test";

import { realtimeEventSchema, SESSION_REVOKED_CODE, userChannel } from "./realtime";

const partner = {
  userId: "u2",
  user: { name: "Ann", image: null, discord: null, twitter: null },
  identity: { name: "Ann", address: null, nickname: null, also: [] },
};

const chatMessage = {
  type: "chat_message",
  conversationId: 7,
  previousMessageId: 40,
  message: {
    id: 41,
    mine: false,
    body: "hello",
    card: null,
    createdAt: "2026-10-11T00:00:00.000Z",
    caution: ["outside_payment"],
    unsent: false,
    offer: null,
  },
  collections: {},
  conversation: {
    id: 7,
    partner,
    last: {
      id: 41,
      mine: false,
      body: "hello",
      card: null,
      offerId: null,
      createdAt: "2026-10-11T00:00:00.000Z",
      unsent: false,
    },
    context: null,
    unread: true,
    request: false,
    archived: false,
    muted: null,
  },
  unread: 2,
  requests: 0,
};

describe("realtimeEventSchema", () => {
  test("parses each event the server publishes", () => {
    expect(realtimeEventSchema.parse({ type: "notifications_changed" }).type).toBe(
      "notifications_changed",
    );
    expect(realtimeEventSchema.parse({ type: "chat_changed", conversationId: 7 })).toEqual({
      type: "chat_changed",
      conversationId: 7,
    });
    expect(realtimeEventSchema.parse({ type: "chat_typing", conversationId: 7 }).type).toBe(
      "chat_typing",
    );
    expect(
      realtimeEventSchema.parse({ type: "chat_unsent", conversationId: 7, messageId: 41 }),
    ).toEqual({ type: "chat_unsent", conversationId: 7, messageId: 41 });
    const parsed = realtimeEventSchema.parse(chatMessage);
    expect(parsed.type === "chat_message" && parsed.message.caution).toEqual(["outside_payment"]);
  });

  test("a chat message without its inbox row or counts is rejected", () => {
    const { conversation: _conversation, ...withoutRow } = chatMessage;
    expect(realtimeEventSchema.safeParse(withoutRow).success).toBe(false);
    const { unread: _unread, ...withoutCount } = chatMessage;
    expect(realtimeEventSchema.safeParse(withoutCount).success).toBe(false);
  });

  test("a chat message names the one before it, or null for the first", () => {
    expect(realtimeEventSchema.safeParse({ ...chatMessage, previousMessageId: null }).success).toBe(
      true,
    );
    const { previousMessageId: _previous, ...without } = chatMessage;
    expect(realtimeEventSchema.safeParse(without).success).toBe(false);
  });

  test("an unknown type is rejected", () => {
    expect(realtimeEventSchema.safeParse({ type: "chat_nuked", conversationId: 7 }).success).toBe(
      false,
    );
    expect(realtimeEventSchema.safeParse({ conversationId: 7 }).success).toBe(false);
  });
});

describe("channels and codes", () => {
  test("a user's channel is theirs alone, and the revoke code is terminal for the client", () => {
    expect(userChannel("abc")).toBe("user:#abc");
    expect(SESSION_REVOKED_CODE).toBeGreaterThanOrEqual(4500);
    expect(SESSION_REVOKED_CODE).toBeLessThan(5000);
  });
});
