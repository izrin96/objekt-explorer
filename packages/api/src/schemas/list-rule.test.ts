import { describe, expect, test } from "bun:test";

import {
  expandRule,
  type ListRuleDef,
  listRuleInputSchema,
  type RuleCollection,
  ruleDef,
  ruleLabel,
  ruleLine,
  ruleProblem,
} from "./list-rule";

const MEMBERS = ["Lynn", "YooYeon", "NaKyoung", "Nien"];

function cols(season: string, no: string, cls: string, members = MEMBERS): RuleCollection[] {
  return members.map((member) => ({
    slug: `${season}-${member}-${no}`.toLowerCase(),
    artist: "triples",
    season,
    collectionNo: no,
    class: cls,
    member,
    onOffline: "online" as const,
  }));
}

const CREAM = [
  ...cols("Cream02", "366Z", "Double"),
  ...cols("Cream02", "366A", "Double").map((c) =>
    Object.assign(c, { slug: `${c.slug}-a`, onOffline: "offline" as const }),
  ),
  ...cols("Cream02", "101Z", "First"),
  ...cols("Cream02", "117Z", "First"),
  ...cols("Cream02", "120Z", "First"),
  ...cols("Binary02", "117Z", "First"),
];

const parse = (input: unknown) => ruleDef(listRuleInputSchema.parse(input));

const anyCc366 = parse({
  kind: "collection",
  artist: "triples",
  season: "Cream02",
  collectionNo: "366Z",
  prio: ["YooYeon", "NaKyoung"],
});

const third = parse({
  kind: "set",
  artist: "triples",
  season: "Cream02",
  class: "First",
  editions: [3],
});

describe("expandRule", () => {
  test("any member of a collection wants every member, online only, whatever the prio", () => {
    const out = expandRule(anyCc366, CREAM, new Set());
    expect(out.slugs).toEqual(cols("Cream02", "366Z", "Double").map((c) => c.slug));
    expect(out).toMatchObject({ covers: 4, owned: 0, canMatch: 4 });
  });

  test("class, season and edition picks that edition of that season", () => {
    const out = expandRule(third, CREAM, new Set());
    expect(out.slugs).toEqual([
      ...cols("Cream02", "117Z", "First").map((c) => c.slug),
      ...cols("Cream02", "120Z", "First").map((c) => c.slug),
    ]);
  });

  test("any edition and any season widen the set", () => {
    const anyEdition = parse({ ...third, editions: [] });
    expect(expandRule(anyEdition, CREAM, new Set()).covers).toBe(12);
    const anySeason = parse({ ...third, season: null });
    expect(expandRule(anySeason, CREAM, new Set()).covers).toBe(12);
  });

  test("chosen members narrow a set", () => {
    const rule = parse({ ...third, members: ["Lynn", "Nien"] });
    expect(expandRule(rule, CREAM, new Set()).slugs).toEqual([
      "cream02-lynn-117z",
      "cream02-nien-117z",
      "cream02-lynn-120z",
      "cream02-nien-120z",
    ]);
  });

  test("skip owned drops held slugs but still counts them", () => {
    const held = new Set(["cream02-lynn-366z", "cream02-nien-366z"]);
    const out = expandRule(anyCc366, CREAM, held);
    expect(out.slugs).toEqual(["cream02-yooyeon-366z", "cream02-nakyoung-366z"]);
    expect(out).toMatchObject({ covers: 4, owned: 2, canMatch: 2 });
  });

  test("skip owned off wants held slugs too", () => {
    const rule: ListRuleDef = { ...anyCc366, skipOwned: false };
    const out = expandRule(rule, CREAM, new Set(["cream02-lynn-366z"]));
    expect(out).toMatchObject({ covers: 4, owned: 1, canMatch: 4 });
  });
});

describe("ruleProblem", () => {
  test("too wide past 500, counted before owned ones are skipped", () => {
    const many = Array.from(
      { length: 501 },
      (_, i) => cols("Cream02", `${300 + i}Z`, "Double", ["Lynn"])[0]!,
    );
    const rule = parse({ kind: "set", artist: "triples", season: "Cream02", class: "Double" });
    const held = new Set(many.slice(0, 10).map((c) => c.slug));
    expect(ruleProblem(rule, expandRule(rule, many, held))).toBe("too_wide");
    expect(ruleProblem(rule, expandRule(rule, many.slice(0, 500), held))).toBeNull();
  });

  test("a rule that describes no collection says so, whatever skip owned is", () => {
    const typo = parse({
      kind: "collection",
      artist: "triples",
      season: "Cream02",
      collectionNo: "999Z",
    });
    expect(ruleProblem(typo, expandRule(typo, CREAM, new Set()))).toBe("no_collections");
    const off: ListRuleDef = { ...typo, skipOwned: false };
    expect(ruleProblem(off, expandRule(off, CREAM, new Set()))).toBe("no_collections");
  });

  test("nothing to match only while skip owned is on", () => {
    const held = new Set(cols("Cream02", "366Z", "Double").map((c) => c.slug));
    expect(ruleProblem(anyCc366, expandRule(anyCc366, CREAM, held))).toBe("nothing_to_match");
    const off: ListRuleDef = { ...anyCc366, skipOwned: false };
    expect(ruleProblem(off, expandRule(off, CREAM, held))).toBeNull();
  });
});

describe("labels", () => {
  test("strip labels", () => {
    expect(ruleLabel(anyCc366)).toBe("CC366 · any member");
    expect(ruleLabel(third)).toBe("Cream02 · FCO · 3rd · any member");
    expect(ruleLabel(parse({ ...third, members: ["Lynn"], editions: [1, 2] }))).toBe(
      "Cream02 · FCO · 1st/2nd · Lynn",
    );
  });

  test("export lines", () => {
    expect(ruleLine(anyCc366)).toBe("any CC366 (prio YooYeon, NaKyoung)");
    expect(ruleLine(third)).toBe("any Cream02 FCO 3rd");
  });

  test("a collection rule keeps no members and a set rule no prio", () => {
    const rule = parse({ ...third, prio: ["Lynn"] });
    expect(rule.prio).toEqual([]);
    expect(anyCc366.members).toEqual([]);
  });
});
