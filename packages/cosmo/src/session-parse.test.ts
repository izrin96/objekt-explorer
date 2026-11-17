import { describe, expect, test } from "bun:test";

import {
  errorKindOf,
  objektSummariesSchema,
  parseSessionCookie,
  sessionUserSchema,
  ticketStatusSchema,
} from "./session-parse";

describe("parseSessionCookie", () => {
  test("reads the value and the Expires date of user-session", () => {
    const parsed = parseSessionCookie([
      "other=1; Path=/",
      "user-session=abc.def_ghi; Domain=shop.cosmo.fans; Path=/; Expires=Wed, 01 Jan 2031 00:00:00 GMT; HttpOnly; SameSite=Strict",
    ]);
    expect(parsed).toEqual({
      value: "abc.def_ghi",
      expiresAt: new Date("2031-01-01T00:00:00Z"),
    });
  });

  test("keeps '=' inside the value", () => {
    const parsed = parseSessionCookie([
      "user-session=abc==; Expires=Wed, 01 Jan 2031 00:00:00 GMT; HttpOnly",
    ]);
    expect(parsed?.value).toBe("abc==");
  });

  test("is null without a user-session cookie", () => {
    expect(parseSessionCookie(["other=1; Path=/", "x=2"])).toBeNull();
    expect(parseSessionCookie([])).toBeNull();
  });

  test("is null for an empty value", () => {
    expect(parseSessionCookie(["user-session=; Expires=Wed, 01 Jan 2031 00:00:00 GMT"])).toBeNull();
  });

  test("keeps a cookie without a usable Expires, with no expiry", () => {
    expect(parseSessionCookie(["user-session=abc; Path=/; HttpOnly"])).toEqual({
      value: "abc",
      expiresAt: null,
    });
    expect(parseSessionCookie(["user-session=abc; Expires=not a date"])?.expiresAt).toBeNull();
  });

  test("Max-Age wins over Expires", () => {
    const now = Date.parse("2026-01-01T00:00:00Z");
    expect(
      parseSessionCookie(
        ["user-session=abc; Max-Age=60; Expires=Wed, 01 Jan 2031 00:00:00 GMT"],
        now,
      )?.expiresAt,
    ).toEqual(new Date(now + 60_000));
  });
});

describe("ticketStatusSchema", () => {
  test("wait_for_user_action keeps the remaining time", () => {
    expect(
      ticketStatusSchema.parse({ status: "wait_for_user_action", ticketRemainingMs: 170000 }),
    ).toEqual({ status: "wait_for_user_action", ticketRemainingMs: 170000 });
  });

  test("wait_for_certify keeps both remaining times and only the nickname of the user", () => {
    const parsed = ticketStatusSchema.parse({
      status: "wait_for_certify",
      ticketRemainingMs: 120000,
      ticketOtpRemainingMs: 58000,
      user: { id: 7, nickname: "someone", profileImageUrl: "https://x.test/a.png" },
      profiles: [{ id: 1 }],
    });
    expect(parsed).toEqual({
      status: "wait_for_certify",
      ticketRemainingMs: 120000,
      ticketOtpRemainingMs: 58000,
      nickname: "someone",
    });
  });

  test("wait_for_certify without a user has no nickname", () => {
    expect(
      ticketStatusSchema.parse({
        status: "wait_for_certify",
        ticketRemainingMs: 120000,
        ticketOtpRemainingMs: 58000,
      }),
    ).toEqual({
      status: "wait_for_certify",
      ticketRemainingMs: 120000,
      ticketOtpRemainingMs: 58000,
      nickname: null,
    });
  });

  test("certified", () => {
    expect(ticketStatusSchema.parse({ status: "certified" })).toEqual({ status: "certified" });
  });

  test("maps an unknown status to unknown", () => {
    expect(ticketStatusSchema.parse({ status: "something_new", extra: 1 })).toEqual({
      status: "unknown",
    });
  });
});

describe("sessionUserSchema", () => {
  test("keeps only nickname and address", () => {
    const parsed = sessionUserSchema.parse({
      id: 12345,
      nickname: "someone",
      address: "0x1111111111111111111111111111111111111111",
      email: "someone@example.test",
      birth: "2000-01-01",
      country: "KR",
      loginChannel: "email",
    });
    expect(parsed).toEqual({
      nickname: "someone",
      address: "0x1111111111111111111111111111111111111111",
    });
    expect(parsed).not.toHaveProperty("email");
    expect(parsed).not.toHaveProperty("birth");
  });

  test("rejects a body without an address", () => {
    expect(sessionUserSchema.safeParse({ nickname: "someone" }).success).toBe(false);
  });
});

const item = (collectionId: string, collection: object = {}, rest: object = {}) => ({
  collection: {
    collectionId,
    frontMedia: null,
    bandImageUrl: "https://resources.example.test/band.png",
    hasVoice: true,
    backImage: "https://imagedelivery.net/x/back/public",
    accentColor: "#ff00aa",
    backgroundColor: "#ffffff",
    textColor: "#000000",
    season: "Cream01",
    ...collection,
  },
  count: 0,
  objekts: [],
  ...rest,
});

const OWNER = "0x1111111111111111111111111111111111111111";
const entry = (
  tokenId: number,
  extra: { metadata?: object; inventory?: object; nonTransferableReason?: string } = {},
) => {
  const { metadata, inventory, ...rest } = extra;
  return {
    metadata: {
      objektNo: 7,
      transferable: true,
      tokenAddress: "0x2222222222222222222222222222222222222222",
      collectionId: "cream01-seoyeon-101z",
      tokenId,
      artist: { category: "tripleS", name: "seoyeon" },
      ...metadata,
    },
    inventory: {
      status: "minted",
      acquiredAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      mintedAt: "2026-01-01T00:00:00Z",
      mintedAtDay: 20260101,
      usedForGrid: false,
      lenticularPairTokenId: 0,
      owner: OWNER,
      objektId: 99,
      ...inventory,
    },
    ...rest,
  };
};

describe("objektSummariesSchema", () => {
  test("keeps only the collection media fields", () => {
    const parsed = objektSummariesSchema.parse({
      collectionCount: 1,
      favoritedObjektCount: 0,
      collections: [item("cream01-seoyeon-101z")],
    });
    expect(parsed).toEqual({
      collectionCount: 1,
      collections: [
        {
          collectionId: "cream01-seoyeon-101z",
          frontMedia: null,
          bandImageUrl: "https://resources.example.test/band.png",
          hasVoice: true,
          backImage: "https://imagedelivery.net/x/back/public",
          accentColor: "#ff00aa",
          textColor: "#000000",
        },
      ],
      skipped: 0,
      objekts: [],
      skippedObjekts: 0,
      partial: 0,
    });
  });

  test("skips a malformed item and counts it", () => {
    const parsed = objektSummariesSchema.parse({
      collectionCount: 3,
      collections: [item("a"), { collection: { collectionId: 5 }, count: 1 }, item("c")],
    });
    expect(parsed.collections.map((c) => c.collectionId)).toEqual(["a", "c"]);
    expect(parsed.skipped).toBe(1);
  });

  test("accepts a collection without bandImageUrl", () => {
    const { bandImageUrl: _drop, ...rest } = item("a").collection;
    const parsed = objektSummariesSchema.parse({
      collectionCount: 1,
      collections: [{ collection: rest, count: 1, objekts: [] }],
    });
    expect(parsed.skipped).toBe(0);
    expect(parsed.collections[0]?.bandImageUrl).toBeNull();
  });

  test("keeps the media of a collection missing its colours and back image", () => {
    const parsed = objektSummariesSchema.parse({
      collectionCount: 1,
      collections: [
        item("a", {
          frontMedia: "https://resources.example.test/motion.mp4",
          backImage: null,
          accentColor: undefined,
          textColor: null,
          hasVoice: null,
        }),
      ],
    });
    expect(parsed.skipped).toBe(0);
    expect(parsed.collections[0]).toMatchObject({
      frontMedia: "https://resources.example.test/motion.mp4",
      backImage: null,
      accentColor: null,
      textColor: null,
      hasVoice: false,
    });
  });

  test("an empty page", () => {
    expect(objektSummariesSchema.parse({ collectionCount: 0, collections: [] })).toEqual({
      collectionCount: 0,
      collections: [],
      skipped: 0,
      objekts: [],
      skippedObjekts: 0,
      partial: 0,
    });
  });
});

describe("objektSummariesSchema objekts", () => {
  const page = (items: unknown[]) =>
    objektSummariesSchema.parse({ collectionCount: items.length, collections: items });

  test("keeps the entries of every collection, flat", () => {
    const parsed = page([
      item(
        "a",
        {},
        {
          count: 2,
          objekts: [
            entry(11),
            entry(12, {
              nonTransferableReason: "challenge-reward",
              metadata: { transferable: false },
              inventory: { usedForGrid: true },
            }),
          ],
        },
      ),
      item(
        "b",
        {},
        { count: 1, objekts: [entry(21, { metadata: { collectionId: "b", objektNo: 3 } })] },
      ),
    ]);
    expect(parsed.collections).toHaveLength(2);
    expect(parsed.skippedObjekts).toBe(0);
    expect(parsed.partial).toBe(0);
    expect(parsed.objekts).toEqual([
      {
        tokenId: "11",
        objektNo: 7,
        collectionId: "cream01-seoyeon-101z",
        transferable: true,
        nonTransferableReason: null,
        usedForGrid: false,
        owner: OWNER,
        status: "minted",
      },
      {
        tokenId: "12",
        objektNo: 7,
        collectionId: "cream01-seoyeon-101z",
        transferable: false,
        nonTransferableReason: "challenge-reward",
        usedForGrid: true,
        owner: OWNER,
        status: "minted",
      },
      {
        tokenId: "21",
        objektNo: 3,
        collectionId: "b",
        transferable: true,
        nonTransferableReason: null,
        usedForGrid: false,
        owner: OWNER,
        status: "minted",
      },
    ]);
  });

  test("an entry missing tokenId is skipped and its collection still parses", () => {
    const bad = entry(1);
    delete (bad.metadata as { tokenId?: number }).tokenId;
    const parsed = page([item("a", {}, { count: 2, objekts: [bad, entry(2)] })]);
    expect(parsed.skippedObjekts).toBe(1);
    expect(parsed.skipped).toBe(0);
    expect(parsed.collections.map((c) => c.collectionId)).toEqual(["a"]);
    expect(parsed.objekts.map((o) => o.tokenId)).toEqual(["2"]);
  });

  test("a reason that is not a slug becomes other", () => {
    const parsed = page([
      item("a", {}, { count: 1, objekts: [entry(1, { nonTransferableReason: "Bad Reason!" })] }),
    ]);
    expect(parsed.objekts[0]?.nonTransferableReason).toBe("other");
  });

  test("lowercases the owner", () => {
    const upper = "0xABCDEFabcdef1234567890ABCDEFabcdef123456";
    const parsed = page([
      item("a", {}, { count: 1, objekts: [entry(1, { inventory: { owner: upper } })] }),
    ]);
    expect(parsed.objekts[0]?.owner).toBe(upper.toLowerCase());
  });

  test("counts an item whose count differs from its objekts", () => {
    const parsed = page([item("a", {}, { count: 3, objekts: [entry(1), entry(2)] })]);
    expect(parsed.partial).toBe(1);
    expect(parsed.objekts).toHaveLength(2);
  });

  test("an item with no objekts array gives none", () => {
    const parsed = page([{ collection: item("a").collection, count: 2 }]);
    expect(parsed.objekts).toEqual([]);
    expect(parsed.skippedObjekts).toBe(0);
  });

  test("a null count keeps the collection and its objekts", () => {
    const parsed = page([item("a", {}, { count: null, objekts: [entry(1)] })]);
    expect(parsed.skipped).toBe(0);
    expect(parsed.collections.map((c) => c.collectionId)).toEqual(["a"]);
    expect(parsed.objekts.map((o) => o.tokenId)).toEqual(["1"]);
    expect(parsed.partial).toBe(0);
  });

  test("null or malformed objekts lose only the objekts, never the collection", () => {
    const parsed = page([
      item("a", {}, { count: 2, objekts: null }),
      item("b", {}, { count: "two", objekts: "nope" }),
    ]);
    expect(parsed.skipped).toBe(0);
    expect(parsed.collections.map((c) => c.collectionId)).toEqual(["a", "b"]);
    expect(parsed.objekts).toEqual([]);
    expect(parsed.partial).toBe(0);
  });

  test("drops dates, lenticular pair and artist", () => {
    const parsed = page([item("a", {}, { count: 1, objekts: [entry(1)] })]);
    const kept = parsed.objekts[0] ?? {};
    for (const key of [
      "acquiredAt",
      "mintedAt",
      "lenticularPairTokenId",
      "artist",
      "tokenAddress",
      "objektId",
    ]) {
      expect(kept).not.toHaveProperty(key);
    }
  });
});

describe("errorKindOf", () => {
  const cosmoError = { error: { code: "UNAUTHORIZED" } };
  const firewall = "<html><body>Access denied</body></html>";

  test("401 or 403 with a cookie and Cosmo's JSON error is dead", () => {
    expect(errorKindOf(401, cosmoError, true)).toBe("dead");
    expect(errorKindOf(403, cosmoError, true)).toBe("dead");
  });

  test("a 403 with an HTML body is unavailable", () => {
    expect(errorKindOf(403, firewall, true)).toBe("unavailable");
    expect(errorKindOf(403, undefined, true)).toBe("unavailable");
    expect(errorKindOf(403, firewall, false)).toBe("unavailable");
  });

  test("401 or 403 without a cookie is refused", () => {
    expect(errorKindOf(401, cosmoError, false)).toBe("refused");
    expect(errorKindOf(403, cosmoError, false)).toBe("refused");
  });

  test("429 is busy", () => {
    expect(errorKindOf(429, undefined, true)).toBe("busy");
  });

  test("any other 4xx is refused", () => {
    expect(errorKindOf(400, { error: { code: "INVALID_RECAPTCHA" } }, false)).toBe("refused");
    expect(errorKindOf(404, undefined, true)).toBe("refused");
  });

  test("5xx and a timeout are unavailable", () => {
    expect(errorKindOf(500, undefined, true)).toBe("unavailable");
    expect(errorKindOf(503, firewall, false)).toBe("unavailable");
    expect(errorKindOf(null, undefined, true)).toBe("unavailable");
  });

  test("anything else is unexpected", () => {
    expect(errorKindOf(200, undefined, true)).toBe("unexpected");
    expect(errorKindOf(302, undefined, false)).toBe("unexpected");
  });
});
