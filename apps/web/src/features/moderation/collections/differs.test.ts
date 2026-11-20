import { describe, expect, test } from "bun:test";

import { differsCount, differsGroups, expectedOf } from "./differs";

const row = (slug: string, staff: string, cosmo: string, more = {}) => ({
  slug,
  artist: "tripleS",
  season: "Cream02",
  collectionNo: "376Z",
  textColor: staff,
  backgroundColor: null,
  textPinned: false,
  backgroundPinned: false,
  cosmo: { textColor: cosmo, backgroundColor: "#e07b36" },
  differs: { text: true, background: false },
  ...more,
});

describe("differsGroups", () => {
  test("members of one number with the same staff and Cosmo colour form one group", () => {
    const groups = differsGroups([
      row("cream02-b-376z", "#000000", "#ffffff"),
      row("cream02-a-376z", "#000000", "#ffffff"),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.members.map((m) => m.slug)).toEqual(["cream02-a-376z", "cream02-b-376z"]);
    expect(groups[0]).toMatchObject({ kind: "text", staff: "#000000", cosmo: "#ffffff" });
  });

  test("members of one number whose colours differ form separate groups", () => {
    const groups = differsGroups([
      row("cream02-a-376z", "#000000", "#ffffff"),
      row("cream02-b-376z", "#ffffff", "#000000"),
    ]);
    expect(groups).toHaveLength(2);
  });

  test("a colour not listed as differing joins no group", () => {
    const groups = differsGroups([
      row("cream02-a-376z", "#000000", "#ffffff", { differs: { text: false, background: false } }),
    ]);
    expect(groups).toEqual([]);
    expect(differsCount([row("x", "#000000", "#ffffff")])).toBe(1);
  });
});

test("expectedOf carries the overrides and pins only", () => {
  expect(expectedOf(row("x", "#000000", "#ffffff"))).toEqual({
    textColor: "#000000",
    backgroundColor: null,
    textPinned: false,
    backgroundPinned: false,
  });
});
