import { describe, expect, test } from "bun:test";

import { browseInputSchema } from "./trade";

describe("browse cursor", () => {
  test("takes the ISO time the feed emits", () => {
    const cursor = { bumpedAt: "2026-10-07T09:12:30.123Z", id: 12 };
    expect(browseInputSchema.parse({ cursor }).cursor).toEqual(cursor);
  });

  test("refuses a time Postgres would choke on", () => {
    for (const bumpedAt of [
      "yesterday",
      "",
      "2026-10-07 09:12:30.123456+00",
      "2026-13-40T00:00:00Z",
    ]) {
      expect(browseInputSchema.safeParse({ cursor: { bumpedAt, id: 12 } }).success).toBe(false);
    }
    expect(
      browseInputSchema.safeParse({ cursor: { bumpedAt: "2026-10-07T09:12:30Z", id: 1.5 } })
        .success,
    ).toBe(false);
  });
});
