import { describe, expect, test } from "bun:test";

import type { OwnedCopy } from "@repo/api/schemas/objekts";
import type { IndexedObjekt } from "@repo/lib/types/objekt";

import { joinOwned } from "./owned-join";

const collection = (slug: string) =>
  ({ id: `uuid-${slug}`, slug, collectionId: "201Z" }) as unknown as IndexedObjekt;

const copy = (id: string, slug: string): OwnedCopy => ({
  id,
  slug,
  serial: 7,
  receivedAt: "2026-11-01T00:00:00.000Z",
  mintedAt: "2026-10-01T00:00:00.000Z",
  transferable: true,
});

describe("joinOwned", () => {
  test("gives each copy its collection's fields, with the token id as id", () => {
    const { objekts, missing } = joinOwned([copy("123", "a")], [collection("a")]);
    expect(missing).toEqual([]);
    expect(objekts).toEqual([
      {
        ...collection("a"),
        id: "123",
        tokenId: "123",
        serial: 7,
        receivedAt: "2026-11-01T00:00:00.000Z",
        mintedAt: "2026-10-01T00:00:00.000Z",
        transferable: true,
      },
    ]);
  });

  test("keeps the copies' order and every copy of one collection", () => {
    const { objekts } = joinOwned(
      [copy("3", "b"), copy("2", "a"), copy("1", "b")],
      [collection("a"), collection("b")],
    );
    expect(objekts.map((objekt) => objekt.id)).toEqual(["3", "2", "1"]);
  });

  test("names a slug the catalogue lacks once, and leaves its copies out", () => {
    const { objekts, missing } = joinOwned(
      [copy("1", "new"), copy("2", "a"), copy("3", "new")],
      [collection("a")],
    );
    expect(objekts.map((objekt) => objekt.id)).toEqual(["2"]);
    expect(missing).toEqual(["new"]);
  });

  test("does not change the catalogue entries", () => {
    const entry = collection("a");
    joinOwned([copy("1", "a")], [entry]);
    expect(entry.id).toBe("uuid-a");
  });
});
