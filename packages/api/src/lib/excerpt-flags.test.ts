import { describe, expect, test } from "bun:test";

import type { ExcerptEntry } from "../schemas/moderation";
import { flagExcerpt } from "./excerpt-flags";

const AT = "2026-10-07T12:00:00.000Z";

const line = (fromTarget: boolean, body: string | null): ExcerptEntry => ({
  fromTarget,
  body,
  card: null,
  at: AT,
});

const offerNote = (note: string | null): ExcerptEntry => ({
  fromTarget: true,
  body: null,
  card: null,
  offer: { offerId: 1, status: "open", give: [], get: [], topup: null, note },
  at: AT,
});

describe("flagExcerpt", () => {
  test("flags a reported account's line with every matched category", () => {
    const [entry] = flagExcerpt([line(true, "send first pls, pay 2000 KRW to wise first")]);
    expect(entry?.flagged).toEqual(["send_first", "outside_payment"]);
  });

  test("flags a pattern in the reported account's offer note", () => {
    const [entry] = flagExcerpt([offerNote("only paypal.me/rin please")]);
    expect(entry?.flagged).toEqual(["outside_payment"]);
  });

  test("never flags the reporter's line, even when it matches a pattern", () => {
    const [entry] = flagExcerpt([line(false, "they told me to send first")]);
    expect(entry?.flagged).toEqual([]);
  });

  test("leaves an empty body and a plain line unflagged and keeps order and fields", () => {
    const entries = [line(true, null), line(true, "happy to trade 204Z for 205Z"), offerNote(null)];
    const flagged = flagExcerpt(entries);
    expect(flagged.map((entry) => entry.flagged)).toEqual([[], [], []]);
    expect(flagged.map(({ flagged: _, ...rest }) => rest)).toEqual(entries);
  });
});
