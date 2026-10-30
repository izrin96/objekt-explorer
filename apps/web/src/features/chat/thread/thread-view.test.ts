import { describe, expect, test } from "bun:test";

import { newDividerAt, newestIncomingId, openedUnread, unreadAtOpen } from "./thread-view";

const theirs = (id: number) => ({ id, mine: false });
const mine = (id: number) => ({ id, mine: true });
const settled = { olderPages: false, lost: false };

describe("newestIncomingId", () => {
  test("skips own messages", () => {
    expect(newestIncomingId([theirs(1), theirs(2), mine(3)])).toBe(2);
  });

  test("is undefined with none of theirs", () => {
    expect(newestIncomingId([mine(1), mine(2)])).toBeUndefined();
    expect(newestIncomingId([])).toBeUndefined();
  });
});

describe("openedUnread", () => {
  test("reads the last read id and the newest incoming one", () => {
    expect(openedUnread([theirs(4), mine(5)], 2)).toEqual({ lastRead: 2, newest: 4 });
  });

  test("gives zeros for a null last read and no incoming messages", () => {
    expect(openedUnread([mine(1)], null)).toEqual({ lastRead: 0, newest: 0 });
    expect(openedUnread([], undefined)).toEqual({ lastRead: 0, newest: 0 });
  });
});

describe("unreadAtOpen", () => {
  test("is false when nothing is newer than the last read", () => {
    expect(unreadAtOpen({ lastRead: 5, newest: 5 })).toBe(false);
    expect(unreadAtOpen({ lastRead: 6, newest: 5 })).toBe(false);
  });

  test("is true when something is", () => {
    expect(unreadAtOpen({ lastRead: 4, newest: 5 })).toBe(true);
  });
});

describe("newDividerAt", () => {
  test("is undefined with nothing unread", () => {
    const messages = [theirs(1), theirs(2)];
    expect(newDividerAt(messages, { lastRead: 2, newest: 2 }, settled)).toBeUndefined();
  });

  test("skips own messages: the line sits above the first incoming unread one", () => {
    const messages = [theirs(1), mine(2), mine(3), theirs(4), theirs(5)];
    expect(newDividerAt(messages, { lastRead: 1, newest: 5 }, settled)).toBe(4);
  });

  test("a message that arrives after open does not move the line", () => {
    const messages = [theirs(1), theirs(2), mine(3), theirs(4)];
    const opened = openedUnread(messages.slice(0, 3), 2);
    expect(opened).toEqual({ lastRead: 2, newest: 2 });
    expect(newDividerAt(messages, opened, settled)).toBeUndefined();
  });

  test("a later arrival leaves the first unread one in place", () => {
    const opened = openedUnread([theirs(1), theirs(2), theirs(3)], 1);
    const messages = [theirs(1), theirs(2), theirs(3), theirs(4)];
    expect(newDividerAt(messages, opened, settled)).toBe(2);
  });

  test("waits for the message before it while older pages remain", () => {
    const opened = { lastRead: 5, newest: 8 };
    const older = { olderPages: true, lost: false };
    expect(newDividerAt([theirs(6), theirs(7), theirs(8)], opened, older)).toBeUndefined();
    expect(newDividerAt([theirs(5), theirs(6), theirs(7), theirs(8)], opened, older)).toBe(6);
  });

  test("is undefined for an empty list", () => {
    expect(newDividerAt([], { lastRead: 0, newest: 3 }, settled)).toBeUndefined();
    expect(
      newDividerAt([], { lastRead: 0, newest: 3 }, { olderPages: true, lost: false }),
    ).toBeUndefined();
  });

  test("is undefined once lost", () => {
    const messages = [theirs(1), theirs(2)];
    expect(
      newDividerAt(messages, { lastRead: 0, newest: 2 }, { olderPages: false, lost: true }),
    ).toBeUndefined();
  });

  test("never read: the first incoming message, once no older pages remain", () => {
    const messages = [mine(1), theirs(2), theirs(3)];
    const opened = openedUnread(messages, null);
    expect(newDividerAt(messages, opened, settled)).toBe(2);
    expect(newDividerAt(messages, opened, { olderPages: true, lost: false })).toBeUndefined();
  });
});
