import { describe, expect, test } from "bun:test";

import { type CopyBinding, copyMode, copyUnit } from "./list-copy";

const bound = (type: CopyBinding["listTypeNew"], address = "0xabc"): CopyBinding => ({
  listTypeNew: type,
  isProfileBind: true,
  profileAddress: address,
});
const unbound = (type: CopyBinding["listTypeNew"]): CopyBinding => ({
  listTypeNew: type,
  isProfileBind: false,
  profileAddress: null,
});

describe("copyMode", () => {
  test("unbound to unbound keeps rows", () => {
    expect(copyMode(unbound("general"), unbound("want"))).toBe("rows");
  });
  test("bound to unbound takes distinct collections", () => {
    expect(copyMode(bound("have"), unbound("general"))).toBe("distinct-collections");
  });
  test("bound to the same profile keeps tokens, whatever the address case", () => {
    expect(copyMode(bound("sale", "0xABC"), bound("have", "0xabc"))).toBe("tokens");
  });
  test("bound to another profile expands", () => {
    expect(copyMode(bound("have"), bound("have", "0xdef"))).toBe("expand");
  });
  test("unbound but filed under the target profile still expands", () => {
    const filed: CopyBinding = { ...unbound("general"), profileAddress: "0xabc" };
    expect(copyMode(filed, bound("have", "0xabc"))).toBe("expand");
  });
  test("unbound to bound expands", () => {
    expect(copyMode(unbound("general"), bound("have"))).toBe("expand");
  });
});

describe("copyUnit", () => {
  test("copies for tokens, collections otherwise", () => {
    expect(copyUnit("rows")).toBe("collections");
    expect(copyUnit("tokens")).toBe("copies");
    expect(copyUnit("distinct-collections")).toBe("collections");
    expect(copyUnit("expand")).toBe("collections");
  });
});
