import { describe, expect, test } from "bun:test";

import { canOpenTab, visibleTabs } from "./staff-tabs";

const ids = (role: string | null) => visibleTabs(role).map((tab) => tab.id);

describe("visibleTabs", () => {
  test("a user, or someone signed out, gets no tab", () => {
    expect(ids("user")).toEqual([]);
    expect(ids(null)).toEqual([]);
  });

  test("a moderator gets every tab but Collections, in order", () => {
    expect(ids("moderator")).toEqual(["reports", "addresses", "banners", "trades", "messages"]);
  });

  test("an admin gets all six, Trade tracking and Message totals after Collections", () => {
    expect(ids("admin")).toEqual([
      "reports",
      "addresses",
      "banners",
      "collections",
      "trades",
      "messages",
    ]);
  });

  test("several roles count together", () => {
    expect(ids("user,admin")).toEqual([
      "reports",
      "addresses",
      "banners",
      "collections",
      "trades",
      "messages",
    ]);
  });
});

describe("canOpenTab", () => {
  test("only an admin opens Collections", () => {
    expect(canOpenTab("collections", "admin")).toBe(true);
    expect(canOpenTab("collections", "moderator")).toBe(false);
  });

  test("a moderator opens Trade tracking and Message totals, and a user neither", () => {
    expect(canOpenTab("trades", "moderator")).toBe(true);
    expect(canOpenTab("messages", "moderator")).toBe(true);
    expect(canOpenTab("trades", "user")).toBe(false);
    expect(canOpenTab("messages", null)).toBe(false);
  });

  test("a moderator opens Banners and a user does not", () => {
    expect(canOpenTab("banners", "moderator")).toBe(true);
    expect(canOpenTab("banners", "user")).toBe(false);
  });
});
