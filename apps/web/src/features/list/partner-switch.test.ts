import { describe, expect, test } from "bun:test";

import { partnerSwitch } from "./partner-switch";

const partner = { id: 2 };

describe("partnerSwitch", () => {
  test("a have list names its want list", () => {
    expect(partnerSwitch({ listType: "have", linkedList: partner })).toBe("want");
  });

  test("a want list names its have list", () => {
    expect(partnerSwitch({ listType: "want", linkedList: partner })).toBe("have");
  });

  // regression: a Sell or swap list showed no way back to its want list
  test("a sale list names its want list", () => {
    expect(partnerSwitch({ listType: "sale", linkedList: partner })).toBe("want");
  });

  test("an unlinked list shows no button", () => {
    expect(partnerSwitch({ listType: "have", linkedList: null })).toBeNull();
    expect(partnerSwitch({ listType: "want", linkedList: null })).toBeNull();
    expect(partnerSwitch({ listType: "sale", linkedList: null })).toBeNull();
  });

  test("a general list shows no button", () => {
    expect(partnerSwitch({ listType: "general", linkedList: partner })).toBeNull();
  });
});
