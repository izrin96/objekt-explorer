import { describe, expect, test } from "bun:test";

import { createHold } from "./hold";

describe("createHold", () => {
  test("a mint whose metadata fails is held", () => {
    const decide = createHold([]);
    expect(decide("50123", { known: false, resolved: false })).toBe("park");
  });

  test("a new token with metadata is recorded", () => {
    const decide = createHold([]);
    expect(decide("50123", { known: false, resolved: true })).toBe("record");
  });

  test("a later transfer of a held token is held even when its metadata returns", () => {
    const decide = createHold(["50123"]);
    expect(decide("50123", { known: false, resolved: true })).toBe("park");
  });

  test("a mint and send in one batch are both held when only the mint fails", () => {
    const decide = createHold([]);
    expect(decide("50123", { known: false, resolved: false })).toBe("park");
    expect(decide("50123", { known: false, resolved: true })).toBe("park");
  });

  test("a held token stays held even once an objekt exists", () => {
    const decide = createHold(["50123"]);
    expect(decide("50123", { known: true, resolved: true })).toBe("park");
  });

  test("a known objekt keeps its collection when the metadata fails", () => {
    const decide = createHold([]);
    expect(decide("40001", { known: true, resolved: false })).toBe("keep-collection");
  });

  test("a known objekt with metadata is recorded", () => {
    const decide = createHold([]);
    expect(decide("40001", { known: true, resolved: true })).toBe("record");
  });

  test("holding one token leaves others alone", () => {
    const decide = createHold([]);
    decide("50123", { known: false, resolved: false });
    expect(decide("50124", { known: false, resolved: true })).toBe("record");
  });
});
