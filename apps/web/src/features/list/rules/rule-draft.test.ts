import { describe, expect, test } from "bun:test";

import {
  addRuleInputSchema,
  type ListRuleDef,
  previewRuleInputSchema,
  ruleDef,
  updateRuleInputSchema,
} from "@repo/api/schemas/list-rule";
import type { ValidArtist } from "@repo/cosmo/types/common";

import {
  collectionDigits,
  fromRule,
  newDraft,
  type RuleDraft,
  toggle,
  toInput,
  togglePrio,
} from "./rule-draft";

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
