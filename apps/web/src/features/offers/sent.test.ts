import { describe, expect, test } from "bun:test";

import type { OfferItemView } from "@repo/api/schemas/offer";

import { allSent } from "./sent";

const item = (overrides: Partial<OfferItemView> = {}): OfferItemView => ({
  collectionSlug: "cream02-chaewon-361z",
  objektId: "1",
  serial: 87,
  serialEstimated: false,
  listSlug: null,
  sentAt: "2026-10-26T01:06:00.000Z",
  ...overrides,
});

describe("allSent", () => {
  test("both sides sent", () => {
    expect(allSent({ give: [item()], get: [item({ objektId: "2" })] })).toBe(true);
  });

  test("one side not sent yet", () => {
    expect(allSent({ give: [item()], get: [item({ objektId: "2", sentAt: null })] })).toBe(false);
  });

  test("an any-copy item never counts as sent", () => {
    expect(allSent({ give: [item()], get: [item({ objektId: null })] })).toBe(false);
  });

  test("an empty side", () => {
    expect(allSent({ give: [item()], get: [] })).toBe(false);
    expect(allSent({ give: [], get: [item()] })).toBe(false);
  });
});
