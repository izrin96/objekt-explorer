import { describe, expect, test } from "bun:test";

import type { IndexedObjekt } from "@repo/lib/types/objekt";

import { shapeRows } from "./collection-shape";

const row = (): IndexedObjekt =>
  ({
    id: "019a-uuid",
    slug: "atom02-haseul-360z",
    originalFrontImage: "https://cosmo/front",
    originalBackImage: "https://cosmo/back",
    frontImage: "https://media/front",
  }) as unknown as IndexedObjekt;

describe("shapeRows", () => {
  test("keeps every field when both are asked for", () => {
    const rows = [row()];
    expect(shapeRows(rows, { originals: true, ids: true }).collections).toEqual([row()]);
  });

  test("drops the Cosmo URLs for originals: false", () => {
    const [shaped] = shapeRows([row()], { originals: false, ids: true }).collections;
    expect(shaped).not.toHaveProperty("originalFrontImage");
    expect(shaped).not.toHaveProperty("originalBackImage");
    expect(shaped).toHaveProperty("id", "019a-uuid");
  });

  test("drops the id for ids: false and keeps the slug", () => {
    const [shaped] = shapeRows([row()], { originals: false, ids: false }).collections;
    expect(shaped).not.toHaveProperty("id");
    expect(shaped).toHaveProperty("slug", "atom02-haseul-360z");
    expect(shaped).toHaveProperty("frontImage", "https://media/front");
  });

  test("shapes the rows it is given in place, so a cached list is copied first", () => {
    const rows = [row()];
    shapeRows(rows, { originals: true, ids: false });
    expect(rows[0]).not.toHaveProperty("id");
  });
});
