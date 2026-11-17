import { describe, expect, test } from "bun:test";

import { objektWriteModes } from "./cosmo-objekt-writes";

const off = { anchors: false, untransferable: false, transferable: false, unknown: [] };

describe("objektWriteModes", () => {
  test("unset and empty turn nothing on", () => {
    expect(objektWriteModes(undefined)).toEqual(off);
    expect(objektWriteModes("")).toEqual(off);
  });

  test("one word", () => {
    expect(objektWriteModes("anchors")).toEqual({ ...off, anchors: true });
  });

  test("trims and lowercases", () => {
    expect(objektWriteModes(" Anchors , untransferable ")).toEqual({
      ...off,
      anchors: true,
      untransferable: true,
    });
  });

  test("all three", () => {
    expect(objektWriteModes("anchors,untransferable,transferable")).toEqual({
      anchors: true,
      untransferable: true,
      transferable: true,
      unknown: [],
    });
  });

  test("an unknown word is reported and ignored", () => {
    expect(objektWriteModes("anchors,bogus")).toEqual({
      ...off,
      anchors: true,
      unknown: ["bogus"],
    });
  });
});
