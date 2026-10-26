import { describe, expect, test } from "bun:test";

import type { ValidObjekt } from "@repo/lib/types/objekt";

import {
  exchangeGroups,
  filterCounts,
  findMatches,
  legStatus,
  needsYouCount,
  openingSide,
} from "./exchange";
import { copy, leg, trade, verified } from "./trade-fixture";

const collection = (member: string, collectionNo: string) =>
  ({ member, collectionNo, artist: "triples", season: "Atom01" }) as unknown as ValidObjekt;

const collections = {
  "seoah-203z": collection("SeoAh", "203Z"),
  "kaede-301a": collection("Kaede", "301A"),
};

const keys = (groups: ReturnType<typeof exchangeGroups>) =>
  groups.map((group) => [group.key, group.profile?.name ?? null, group.legs.length]);

describe("legStatus", () => {
  test("a leg the viewer can send needs them", () => {
    expect(legStatus(leg(), false)).toEqual({ chip: "sendThis", needsYou: true, warning: null });
  });

  test("a different copy waits on the receiver, not the giver", () => {
    expect(legStatus(leg({ fromYou: false, substitutes: [copy()] }), false).needsYou).toBe(true);
    expect(legStatus(leg({ substitutes: [copy()] }), false).needsYou).toBe(false);
  });

  test("stuck and away are warnings on a waiting leg only", () => {
    const away = { at: "2026-10-12T12:00:00.000Z", breaksAt: "2026-10-13T12:00:00.000Z" };
    expect(legStatus(leg({ stuck: true }), false)).toEqual({
      chip: "waiting",
      needsYou: false,
      warning: "stuck",
    });
    expect(legStatus(leg({ fromYou: false, away }), false).warning).toBe("away");
    expect(legStatus(leg({ away }), true).warning).toBeNull();
  });
});

describe("exchangeGroups", () => {
  const give = [
    leg(),
    leg(),
    leg({ stuck: true }),
    verified(),
    leg({ fromYou: true, substitutes: [copy()] }),
  ];

  test("groups in spec order and drops empty ones", () => {
    expect(keys(exchangeGroups(give, { ended: false, collections }))).toEqual([
      ["send", null, 2],
      ["waiting", null, 2],
      ["verified", null, 1],
    ]);
  });

  test("Decide on these holds different copies waiting on the viewer", () => {
    const get = [leg({ fromYou: false, substitutes: [copy()] }), leg({ fromYou: false })];
    expect(keys(exchangeGroups(get, { ended: false, collections }))).toEqual([
      ["decide", null, 1],
      ["waiting", null, 1],
    ]);
  });

  test("an ended trade's unsent legs group under Not sent", () => {
    expect(keys(exchangeGroups([leg(), verified()], { ended: true, collections }))).toEqual([
      ["verified", null, 1],
      ["notSent", null, 1],
    ]);
  });

  test("filters keep only their groups", () => {
    expect(keys(exchangeGroups(give, { ended: false, filter: "needsYou", collections }))).toEqual([
      ["send", null, 2],
    ]);
    expect(keys(exchangeGroups(give, { ended: false, filter: "waiting", collections }))).toEqual([
      ["waiting", null, 2],
    ]);
    expect(exchangeGroups(give, { ended: false, filter: "verified", collections })).toHaveLength(1);
  });

  test("find matches member and collection code, ignoring case", () => {
    const legs = [leg({ collectionSlug: "seoah-203z" }), leg({ collectionSlug: "kaede-301a" })];
    const found = (find: string) =>
      exchangeGroups(legs, { ended: false, find, collections }).flatMap((group) =>
        group.legs.map((l) => l.collectionSlug),
      );
    expect(found("seoah")).toEqual(["seoah-203z"]);
    expect(found("301a")).toEqual(["kaede-301a"]);
    expect(found("  ")).toHaveLength(2);
    expect(found("nobody")).toEqual([]);
  });

  test("find falls back to the slug while a collection is unknown", () => {
    expect(findMatches(leg({ collectionSlug: "lynn-101z" }), "LYNN", collections)).toBe(true);
  });

  test("Send these splits by profile only for two or more, any copy last", () => {
    const main = { address: "0xa", name: "izrin96" };
    const alt = { address: "0xb", name: "izrin96_b" };
    const split = [
      leg({ heldBy: main }),
      leg({ heldBy: alt }),
      leg({ heldBy: main }),
      leg({ objektId: null, heldBy: null }),
    ];
    expect(keys(exchangeGroups(split, { ended: false, collections }))).toEqual([
      ["send", "izrin96", 2],
      ["send", "izrin96_b", 1],
      ["send", null, 1],
    ]);
    expect(exchangeGroups(split, { ended: false, collections }).at(-1)?.anyCopy).toBe(true);
    const unheld = [leg({ heldBy: main }), leg({ heldBy: alt }), leg(), leg({ objektId: null })];
    const groups = exchangeGroups(unheld, { ended: false, collections });
    expect(keys(groups)).toEqual([
      ["send", "izrin96", 1],
      ["send", "izrin96_b", 1],
      ["send", null, 1],
      ["send", null, 1],
    ]);
    // a named objekt on none of the profiles is not headed as any copy
    expect(groups.map((group) => group.anyCopy ?? false)).toEqual([false, false, false, true]);
    const one = [leg({ heldBy: main }), leg({ heldBy: main })];
    expect(keys(exchangeGroups(one, { ended: false, collections }))).toEqual([["send", null, 2]]);
  });
});

describe("counts", () => {
  test("Needs you counts owed legs and different copies waiting on the viewer", () => {
    const legs = [
      leg(),
      leg(),
      leg({ fromYou: false, substitutes: [copy()] }),
      leg({ fromYou: false }),
      verified({ fromYou: false }),
    ];
    expect(filterCounts(legs, false)).toEqual({ all: 5, needsYou: 3, waiting: 1, verified: 1 });
    expect(needsYouCount(trade({ legs }))).toBe(3);
  });

  test("nothing needs the viewer once the trade ended", () => {
    expect(needsYouCount(trade({ status: "cancelled", legs: [leg()] }))).toBe(0);
  });
});

describe("openingSide", () => {
  test("opens on You get when only a different copy there needs the viewer", () => {
    const legs = [verified(), leg({ fromYou: false, substitutes: [copy()] })];
    expect(openingSide(trade({ legs }))).toBe("get");
  });

  test("You give wins when both sides need the viewer, and by default", () => {
    expect(
      openingSide(trade({ legs: [leg(), leg({ fromYou: false, substitutes: [copy()] })] })),
    ).toBe("give");
    expect(openingSide(trade({ legs: [verified(), leg({ fromYou: false })] }))).toBe("give");
  });
});
