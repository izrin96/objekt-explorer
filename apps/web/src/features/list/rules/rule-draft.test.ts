import { describe, expect, test } from "bun:test";

import {
  addRuleInputSchema,
  type ListRuleDef,
  previewRuleInputSchema,
  ruleDef,
  updateRuleInputSchema,
} from "@repo/api/schemas/list-rule";
import type { ValidArtist } from "@repo/cosmo/types/common";

import { m } from "@/paraglide/messages";

import {
  ANY,
  artistPatch,
  classesOf,
  classOptions,
  collectionDigits,
  editionLabel,
  fromRule,
  kindPatch,
  newDraft,
  previewIsCurrent,
  type RuleDraft,
  seasonFor,
  seasonOptions,
  seasonsOf,
  toggle,
  toInput,
  togglePrio,
} from "./rule-draft";

// `m.*` returns a branded string, which `expect(...).toBe("...")` rejects.
const check = (actual: unknown) => expect(actual);

const ARTISTS: ValidArtist[] = ["tripleS", "artms", "idntt"];

const collectionDraft = (patch: Partial<RuleDraft> = {}): RuleDraft => ({
  kind: "collection",
  artist: "tripleS",
  season: "Cream02",
  collectionNo: "366",
  cls: "First",
  editions: [],
  members: [],
  prio: ["SeoYeon"],
  skipOwned: false,
  ...patch,
});

const setDraft = (patch: Partial<RuleDraft> = {}): RuleDraft => ({
  kind: "set",
  artist: "tripleS",
  season: "Cream02",
  collectionNo: "",
  cls: "First",
  editions: [1, 3],
  members: ["SeoYeon", "Jiwoo"],
  prio: [],
  skipOwned: true,
  ...patch,
});

const defOf = (draft: RuleDraft): ListRuleDef => {
  const input = toInput(draft);
  if (!input) throw new Error("incomplete draft");
  return ruleDef(input);
};

describe("toInput, collection rule", () => {
  test("adds the online suffix, lowercases the artist and carries prio and skipOwned", () => {
    const input = toInput(collectionDraft());
    expect(input).toEqual({
      kind: "collection",
      artist: "triples",
      season: "Cream02",
      collectionNo: "366Z",
      prio: ["SeoYeon"],
      skipOwned: false,
    });
    expect(input?.artist).toBe("triples");
  });

  test("trims the number", () => {
    expect(toInput(collectionDraft({ collectionNo: " 366 " }))).toMatchObject({
      collectionNo: "366Z",
    });
  });

  test("is incomplete for a short or long number, or without a season", () => {
    expect(toInput(collectionDraft({ collectionNo: "36" }))).toBeNull();
    expect(toInput(collectionDraft({ collectionNo: "3666" }))).toBeNull();
    expect(toInput(collectionDraft({ season: null }))).toBeNull();
  });
});

describe("toInput, set rule", () => {
  test("keeps editions for a class that has them", () => {
    expect(toInput(setDraft())).toEqual({
      kind: "set",
      artist: "triples",
      season: "Cream02",
      class: "First",
      editions: [1, 3],
      members: ["SeoYeon", "Jiwoo"],
      skipOwned: true,
    });
  });

  test("drops editions for Double, for any class and for idntt", () => {
    expect(toInput(setDraft({ cls: "Double" }))).toMatchObject({ editions: [] });
    expect(toInput(setDraft({ cls: null }))).toMatchObject({ class: null, editions: [] });
    expect(toInput(setDraft({ artist: "idntt" }))).toMatchObject({
      artist: "idntt",
      editions: [],
    });
  });

  test("allows any season", () => {
    expect(toInput(setDraft({ season: null }))).toMatchObject({ season: null });
  });
});

describe("schema round trip", () => {
  const collection = toInput(collectionDraft());
  const set = toInput(setDraft());

  test.each([
    ["collection", collection],
    ["set", set],
  ])("a %s rule parses to itself through every rule input schema", (_, rule) => {
    expect(rule).not.toBeNull();
    expect(previewRuleInputSchema.parse({ rule }).rule).toEqual(rule!);
    expect(addRuleInputSchema.parse({ slug: "x", rule }).rule).toEqual(rule!);
    expect(updateRuleInputSchema.parse({ slug: "x", ruleId: 1, rule }).rule).toEqual(rule!);
  });
});

describe("fromRule", () => {
  const base: ListRuleDef = {
    kind: "set",
    artist: "triples",
    season: "Cream02",
    collectionNo: null,
    class: "Double",
    editions: [],
    members: [],
    prio: [],
    skipOwned: true,
  };

  test("restores the artist's name, or falls back to the first artist", () => {
    expect(fromRule(base, ARTISTS).artist).toBe("tripleS");
    expect(fromRule({ ...base, artist: "nobody" }, ARTISTS).artist).toBe("tripleS");
    expect(fromRule({ ...base, artist: "nobody" }, ["artms", "idntt"]).artist).toBe("artms");
  });

  test("strips the suffix of a collection number", () => {
    const collection = { ...base, kind: "collection" as const, collectionNo: "366Z" };
    expect(fromRule(collection, ARTISTS).collectionNo).toBe("366");
    expect(fromRule(base, ARTISTS).collectionNo).toBe("");
  });

  test("a collection rule gets the First class, a set rule keeps its own, null included", () => {
    expect(fromRule({ ...base, kind: "collection", class: null }, ARTISTS).cls).toBe("First");
    expect(fromRule(base, ARTISTS).cls).toBe("Double");
    expect(fromRule({ ...base, class: null }, ARTISTS).cls).toBeNull();
  });
});

describe("toInput and fromRule round trip", () => {
  test("a set draft comes back as it was", () => {
    const draft = setDraft();
    expect(fromRule(defOf(draft), ARTISTS)).toEqual(draft);
  });

  test("a set draft's editions are dropped where the class has none", () => {
    const draft = setDraft({ cls: "Double" });
    expect(fromRule(defOf(draft), ARTISTS)).toEqual({ ...draft, editions: [] });
    const idntt = setDraft({ artist: "idntt" });
    expect(fromRule(defOf(idntt), ARTISTS)).toEqual({ ...idntt, editions: [] });
  });

  test("a collection draft comes back as it was, its class always First", () => {
    const draft = collectionDraft();
    expect(fromRule(defOf(draft), ARTISTS)).toEqual(draft);
    const other = collectionDraft({ cls: "Double" });
    expect(fromRule(defOf(other), ARTISTS)).toEqual({ ...other, cls: "First" });
  });
});

describe("newDraft", () => {
  test("starts a set rule on the newest season", () => {
    expect(newDraft("artms", ["Atom01", "Atom02"])).toEqual({
      kind: "set",
      artist: "artms",
      season: "Atom02",
      collectionNo: "",
      cls: "First",
      editions: [],
      members: [],
      prio: [],
      skipOwned: true,
    });
  });

  test("has no season when there are none", () => {
    expect(newDraft("artms", []).season).toBeNull();
  });

  test("is a complete input the server accepts", () => {
    const input = toInput(newDraft("tripleS", ["Atom01", "Cream02"]));
    expect(input).not.toBeNull();
    expect(previewRuleInputSchema.parse({ rule: input }).rule).toEqual(input!);
    expect(toInput(newDraft("tripleS", []))).not.toBeNull();
  });
});

describe("toggle", () => {
  test("adds at the end", () => {
    expect(toggle(["a", "b"], "c")).toEqual(["a", "b", "c"]);
  });

  test("removes and keeps the order of the rest", () => {
    expect(toggle(["a", "b", "c"], "b")).toEqual(["a", "c"]);
  });
});

describe("togglePrio", () => {
  const six = ["a", "b", "c", "d", "e", "f"];

  test("adds and removes a member", () => {
    expect(togglePrio(["a"], "b")).toEqual(["a", "b"]);
    expect(togglePrio(["a", "b"], "a")).toEqual(["b"]);
  });

  test("a seventh member leaves six", () => {
    expect(togglePrio(six, "g")).toEqual(six);
  });

  test("the cap is the server's: six parse, seven do not", () => {
    const rule = (prio: string[]) => ({ rule: toInput(collectionDraft({ prio })) });
    expect(previewRuleInputSchema.safeParse(rule(six)).success).toBe(true);
    expect(previewRuleInputSchema.safeParse(rule([...six, "g"])).success).toBe(false);
  });
});

describe("collectionDigits", () => {
  test("keeps the first three digits", () => {
    expect(collectionDigits("3a6-6")).toBe("366");
    expect(collectionDigits("12345")).toBe("123");
    expect(collectionDigits("")).toBe("");
  });
});

describe("seasonsOf and classesOf", () => {
  const data = {
    seasonsMap: [{ artistId: "tripleS" as const, seasons: ["Atom01", "Cream02"] }],
    classesMap: [{ artistId: "tripleS" as const, classes: ["First", "Double"] }],
  };

  test("return the artist's list", () => {
    expect(seasonsOf(data, "tripleS")).toEqual(["Atom01", "Cream02"]);
    expect(classesOf(data, "tripleS")).toEqual(["First", "Double"]);
  });

  test("are empty without data or for a missing artist", () => {
    expect(seasonsOf(undefined, "tripleS")).toEqual([]);
    expect(classesOf(undefined, "tripleS")).toEqual([]);
    expect(seasonsOf(data, "artms")).toEqual([]);
    expect(classesOf(data, "artms")).toEqual([]);
  });
});

describe("seasonFor", () => {
  const seasons = ["Atom01", "Cream02"];

  test("a collection rule without a season gets the newest, or none", () => {
    expect(seasonFor("collection", null, seasons)).toBe("Cream02");
    expect(seasonFor("collection", null, [])).toBeNull();
  });

  test("a set rule without a season stays without", () => {
    expect(seasonFor("set", null, seasons)).toBeNull();
  });

  test("keeps an existing season for either kind", () => {
    expect(seasonFor("collection", "Atom01", seasons)).toBe("Atom01");
    expect(seasonFor("set", "Atom01", seasons)).toBe("Atom01");
  });
});

describe("kindPatch", () => {
  const seasons = ["Atom01", "Cream02"];

  test("to a collection rule with Any season picks the newest", () => {
    expect(kindPatch(setDraft({ season: null }), "collection", seasons)).toEqual({
      kind: "collection",
      season: "Cream02",
    });
  });

  test("to a set rule keeps Any season", () => {
    expect(kindPatch(collectionDraft({ season: null }), "set", seasons)).toEqual({
      kind: "set",
      season: null,
    });
  });

  test("keeps a chosen season", () => {
    expect(kindPatch(setDraft({ season: "Atom01" }), "collection", seasons).season).toBe("Atom01");
  });
});

describe("artistPatch", () => {
  const next = { seasons: ["Atom01", "Atom02"], classes: ["First", "Special"] };

  test("clears what belongs to the old artist and sets the new one", () => {
    expect(artistPatch(setDraft(), "artms", next)).toMatchObject({
      artist: "artms",
      collectionNo: "",
      editions: [],
      members: [],
      prio: [],
    });
  });

  test("a collection draft gets the new artist's newest season, a set draft none", () => {
    expect(artistPatch(collectionDraft(), "artms", next).season).toBe("Atom02");
    expect(artistPatch(setDraft(), "artms", next).season).toBeNull();
  });

  test("any class stays any", () => {
    expect(artistPatch(setDraft({ cls: null }), "artms", next).cls).toBeNull();
  });

  test("keeps a class the new artist has", () => {
    expect(artistPatch(setDraft({ cls: "Special" }), "artms", next).cls).toBe("Special");
  });

  test("falls back to the new artist's first class", () => {
    expect(artistPatch(setDraft({ cls: "Double" }), "artms", next).cls).toBe("First");
  });

  test("keeps the class when the new artist has none", () => {
    expect(artistPatch(setDraft({ cls: "Double" }), "artms", { ...next, classes: [] }).cls).toBe(
      "Double",
    );
  });
});

describe("seasonOptions", () => {
  test("a set rule offers Any first, then the seasons newest first", () => {
    const options = seasonOptions("set", ["Atom01", "Cream02"]);
    expect(options.map((o) => o.value)).toEqual([ANY, "Cream02", "Atom01"]);
    check(options[0]!.label).toBe(m.rule_any_season());
    expect(options[1]!.label).toBe("Cream02");
  });

  test("a collection rule has no Any", () => {
    expect(seasonOptions("collection", ["Atom01", "Cream02"]).map((o) => o.value)).toEqual([
      "Cream02",
      "Atom01",
    ]);
  });

  test("leaves the input as it was", () => {
    const seasons = ["Atom01", "Cream02"];
    seasonOptions("set", seasons);
    expect(seasons).toEqual(["Atom01", "Cream02"]);
  });
});

describe("classOptions", () => {
  test("offers Any first, then the classes in order", () => {
    const options = classOptions(["First", "Double"]);
    expect(options.map((o) => o.value)).toEqual([ANY, "First", "Double"]);
    check(options[0]!.label).toBe(m.rule_any_class());
    expect(options[2]!.label).toBe("Double");
  });
});

describe("editionLabel", () => {
  test("is the ordinal", () => {
    expect(editionLabel(1)).toBe("1st");
    expect(editionLabel(2)).toBe("2nd");
    expect(editionLabel(3)).toBe("3rd");
  });
});

describe("previewIsCurrent", () => {
  const input = () => toInput(setDraft());

  test("equal content in different objects is current", () => {
    expect(previewIsCurrent(input(), input(), false)).toBe(true);
  });

  test("a deferred value that lags is not", () => {
    expect(previewIsCurrent(input(), toInput(setDraft({ season: null })), false)).toBe(false);
  });

  test("a kept placeholder is not", () => {
    expect(previewIsCurrent(input(), input(), true)).toBe(false);
  });

  test("an incomplete rule is not", () => {
    expect(previewIsCurrent(null, null, false)).toBe(false);
  });
});
