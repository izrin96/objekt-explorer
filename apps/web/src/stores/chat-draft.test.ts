import { beforeEach, describe, expect, test } from "bun:test";

import {
  beginSend,
  type DraftReply,
  markRepliesUnsent,
  restoreDraft,
  sentReplies,
  setDraftBody,
  setDraftReply,
  useChatDraft,
} from "./chat-draft";

const reply = (id: number, excerpt = `m${id}`): DraftReply => ({
  id,
  quote: { id, mine: false, excerpt, card: null, state: "shown" },
});
const draft = () => useChatDraft.getState().drafts[1];

beforeEach(() => {
  useChatDraft.setState({ cards: {}, drafts: {} });
  sentReplies.clear();
});

describe("the reply in a draft", () => {
  test("survives an emptied box, and goes with the draft once stopped", () => {
    setDraftReply(1, reply(5));
    setDraftBody(1, "ok");
    setDraftBody(1, "");
    expect(draft()).toEqual({ body: "", clientId: null, reply: reply(5) });
    setDraftReply(1, null);
    expect(draft()).toBeUndefined();
  });

  test("an emptied box with no reply drops the draft, as before", () => {
    setDraftBody(1, "ok");
    setDraftBody(1, "");
    expect(draft()).toBeUndefined();
  });

  // a failed send restored unedited keeps its id, so each change below must drop it
  const restored = (withReply: DraftReply | null) => {
    setDraftReply(1, withReply);
    setDraftBody(1, "ok");
    const sent = beginSend(1, "ok");
    restoreDraft(1, sent);
    expect(draft()?.clientId).toBe(sent.clientId);
  };

  test("choosing a reply starts a new send", () => {
    restored(null);
    setDraftReply(1, reply(5));
    expect(draft()).toEqual({ body: "ok", clientId: null, reply: reply(5) });
  });

  test("changing the reply starts a new send", () => {
    restored(reply(5));
    setDraftReply(1, reply(8));
    expect(draft()).toEqual({ body: "ok", clientId: null, reply: reply(8) });
  });

  test("stopping the reply starts a new send and keeps the text", () => {
    restored(reply(5));
    setDraftReply(1, null);
    expect(draft()).toEqual({ body: "ok", clientId: null, reply: null });
  });
});

describe("beginSend and restoreDraft", () => {
  test("a send carries its reply, which waits in sentReplies and comes back on failure", () => {
    setDraftReply(1, reply(5));
    setDraftBody(1, "got them both");
    const sent = beginSend(1, "got them both");
    expect(sent.reply).toEqual(reply(5));
    expect(sentReplies.get(sent.clientId)).toEqual(reply(5));
    expect(draft()).toBeUndefined();

    restoreDraft(1, sent);
    expect(draft()).toEqual({ body: "got them both", clientId: sent.clientId, reply: reply(5) });
  });

  test("a newer reply wins, the failed text comes back without its own and with a new send", () => {
    setDraftReply(1, reply(5));
    setDraftBody(1, "sent it");
    const sent = beginSend(1, "sent it");
    setDraftReply(1, reply(8));

    restoreDraft(1, sent);
    expect(draft()).toEqual({ body: "sent it", clientId: null, reply: reply(8) });
  });

  test("text typed since goes after the failed text, and the failed reply stays", () => {
    setDraftReply(1, reply(5));
    const sent = beginSend(1, "one");
    setDraftBody(1, "two");

    restoreDraft(1, sent);
    expect(draft()).toEqual({ body: "one\ntwo", clientId: null, reply: reply(5) });
  });
});

describe("markRepliesUnsent", () => {
  test("blanks the quote in a draft and in a send in flight", () => {
    setDraftReply(1, reply(5, "wrong one, sorry"));
    const sent = beginSend(1, "");
    setDraftReply(1, reply(5, "wrong one, sorry"));
    useChatDraft.setState((state) => ({
      drafts: { ...state.drafts, 2: { body: "x", clientId: null, reply: reply(6) } },
    }));

    markRepliesUnsent(new Set([5]));
    const unsent = { id: 5, mine: false, excerpt: null, card: null, state: "unsent" } as const;
    expect(draft()?.reply?.quote).toEqual(unsent);
    expect(sentReplies.get(sent.clientId)?.quote).toEqual(unsent);
    expect(useChatDraft.getState().drafts[2]?.reply).toEqual(reply(6));
  });
});
