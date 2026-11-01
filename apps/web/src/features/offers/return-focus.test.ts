import { beforeEach, describe, expect, test } from "bun:test";

import { armReturn, forgetOpener, rememberOpener, takeReturn } from "./return-focus";

beforeEach(forgetOpener);

describe("return focus", () => {
  test("the opener takes focus once the page is left", () => {
    rememberOpener("row-1");
    armReturn();
    expect(takeReturn("row-2")).toBe(false);
    expect(takeReturn("row-1")).toBe(true);
    expect(takeReturn("row-1")).toBe(false);
  });

  test("nothing is taken while the offer page is still open", () => {
    rememberOpener("row-1");
    expect(takeReturn("row-1")).toBe(false);
  });

  test("a sent offer forgets its opener", () => {
    rememberOpener("chat-add:42");
    forgetOpener();
    armReturn();
    expect(takeReturn("chat-add:42")).toBe(false);
  });

  test("a newer opener replaces an older one", () => {
    rememberOpener("row-1");
    armReturn();
    rememberOpener("row-2");
    expect(takeReturn("row-1")).toBe(false);
  });
});
