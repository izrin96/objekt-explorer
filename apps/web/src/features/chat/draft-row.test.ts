import { describe, expect, test } from "bun:test";

import { nextDraftId, showsDraft } from "./draft-row";

const empty = { id: 7, empty: true, archived: false };
const written = { ...empty, empty: false };

describe("nextDraftId", () => {
  test("an open empty thread is taken", () => {
    expect(nextDraftId(null, empty, [])).toBe(7);
  });

  test("kept after the first send until the list holds its row", () => {
    expect(nextDraftId(7, written, [])).toBe(7);
    expect(nextDraftId(7, written, [3, 7])).toBeNull();
  });

  test("a thread that already had messages is never taken", () => {
    expect(nextDraftId(null, written, [])).toBeNull();
  });

  test("kept while another conversation is open", () => {
    expect(nextDraftId(7, { id: 3, empty: false, archived: false }, [3])).toBe(7);
  });
});

describe("showsDraft", () => {
  test("the open draft in the Inbox, before its row arrives", () => {
    expect(showsDraft(7, empty, [], "inbox", undefined)).toBe(true);
    expect(showsDraft(7, written, [], "inbox", undefined)).toBe(true);
  });

  test("not once the list holds it", () => {
    expect(showsDraft(7, written, [7], "inbox", undefined)).toBe(false);
  });

  test("not in another box, while searching, or for another thread", () => {
    expect(showsDraft(7, empty, [], "requests", undefined)).toBe(false);
    expect(showsDraft(7, empty, [], "inbox", "rin")).toBe(false);
    expect(showsDraft(3, empty, [], "inbox", undefined)).toBe(false);
    expect(showsDraft(7, null, [], "inbox", undefined)).toBe(false);
  });

  test("not for an archived conversation", () => {
    expect(showsDraft(7, { ...written, archived: true }, [], "inbox", undefined)).toBe(false);
  });

  test("a sent-then-archived conversation stays gone", () => {
    const forgotten = nextDraftId(7, written, [7]);
    expect(showsDraft(forgotten, { ...written, archived: true }, [], "inbox", undefined)).toBe(
      false,
    );
  });
});
