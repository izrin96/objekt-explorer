import { describe, expect, test } from "bun:test";

import { MESSAGE_MAX_LENGTH, sendInputSchema } from "@repo/api/schemas/chat";

import type { Attachment } from "@/features/chat/attachment";

import { boxCheck, COUNTER_FROM, keyAction, sendInput } from "./composer-rules";

const CLIENT_ID = "0b0f6a1e-6f0e-4f43-8d0e-3f6a1b2c4d5e";

describe("boxCheck", () => {
  test("an empty box with no card is empty", () => {
    expect(boxCheck("", false, false)).toMatchObject({ length: 0, empty: true, ready: false });
  });

  test("an empty box with a card is ready", () => {
    expect(boxCheck("", true, false)).toMatchObject({ empty: false, ready: true });
  });

  test("whitespace only is empty", () => {
    expect(boxCheck(" \n\t ", false, false)).toMatchObject({
      length: 0,
      empty: true,
      ready: false,
    });
  });

  test("length counts code points", () => {
    expect(boxCheck("👍", false, false).length).toBe(1);
  });

  test("the counter shows from COUNTER_FROM", () => {
    expect(boxCheck("a".repeat(COUNTER_FROM - 1), false, false).counter).toBe(false);
    expect(boxCheck("a".repeat(COUNTER_FROM), false, false).counter).toBe(true);
  });

  test("the maximum is ready, one past it is over and not ready", () => {
    expect(boxCheck("a".repeat(MESSAGE_MAX_LENGTH), false, false)).toMatchObject({
      over: 0,
      ready: true,
    });
    expect(boxCheck("a".repeat(MESSAGE_MAX_LENGTH + 1), false, false)).toMatchObject({
      over: 1,
      ready: false,
    });
  });

  test("a blocked box is not ready", () => {
    expect(boxCheck("hi", false, true).ready).toBe(false);
  });
});

describe("keyAction", () => {
  const key = (over: Partial<Parameters<typeof keyAction>[0]> = {}) => ({
    key: "Enter",
    shiftKey: false,
    isComposing: false,
    keyCode: 13,
    ...over,
  });

  test("Enter sends", () => {
    expect(keyAction(key(), false)).toBe("send");
  });

  test("Shift+Enter does nothing", () => {
    expect(keyAction(key({ shiftKey: true }), false)).toBeNull();
  });

  test("Enter while composing does nothing, and so does keyCode 229", () => {
    expect(keyAction(key({ isComposing: true }), false)).toBeNull();
    expect(keyAction(key({ keyCode: 229 }), false)).toBeNull();
  });

  test("Escape stops a reply, and only while replying", () => {
    expect(keyAction(key({ key: "Escape", keyCode: 27 }), true)).toBe("stop-reply");
    expect(keyAction(key({ key: "Escape", keyCode: 27 }), false)).toBeNull();
  });

  test("Escape while composing does not stop a reply", () => {
    expect(keyAction(key({ key: "Escape", isComposing: true }), true)).toBeNull();
  });

  test("any other key does nothing", () => {
    expect(keyAction(key({ key: "a", keyCode: 65 }), true)).toBeNull();
  });
});

describe("sendInput", () => {
  const card: Attachment["input"] = { kind: "objekt", collectionSlug: "atom01-heejin-101z" };
  const attachment = { kind: "objekt", input: card } as Attachment;
  const sent = (body: string, reply: { id: number } | null = null) => ({
    body,
    clientId: CLIENT_ID,
    reply: reply as never,
  });

  test("a whitespace-only body with a card sends no body", () => {
    const input = sendInput(7, sent("  \n"), attachment);
    expect(input.body).toBeUndefined();
    expect(sendInputSchema.safeParse(input).success).toBe(true);
  });

  test("a body with text is sent untrimmed (current behaviour)", () => {
    const input = sendInput(7, sent("hi\n"), null);
    expect(input.body).toBe("hi\n");
    expect(sendInputSchema.safeParse(input).success).toBe(true);
  });

  test("replyTo is the reply's id, or undefined without a reply", () => {
    const withReply = sendInput(7, sent("hi", { id: 42 }), null);
    expect(withReply.replyTo).toBe(42);
    expect(sendInputSchema.safeParse(withReply).success).toBe(true);
    expect(sendInput(7, sent("hi"), null).replyTo).toBeUndefined();
  });

  test("card is the attachment's input, or undefined without one", () => {
    const withCard = sendInput(7, sent("hi"), attachment);
    expect(withCard.card).toEqual(card);
    expect(sendInputSchema.safeParse(withCard).success).toBe(true);
    expect(sendInput(7, sent("hi"), null).card).toBeUndefined();
  });

  test("carries the conversation and send id", () => {
    expect(sendInput(7, sent("hi"), null)).toMatchObject({
      conversationId: 7,
      clientId: CLIENT_ID,
    });
  });
});
