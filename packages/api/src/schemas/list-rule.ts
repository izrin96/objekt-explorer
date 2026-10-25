import { getCollectionEdition } from "@repo/lib/collection-edition";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import * as z from "zod";

/** A rule covers at most this many objekts, counted before Skip ones I own. */
export const RULE_MAX_OBJEKTS = 500;
export const RULE_MAX_PER_LIST = 20;
const PRIO_MAX = 6;

/** The classes whose collection numbers have editions (`getCollectionEdition`). */
export const RULE_EDITION_CLASSES = ["First", "Special", "Motion"] as const;
export const RULE_EDITIONS = [1, 2, 3] as const;

/** Whether a rule can pick editions: idntt numbers its collections with none (`getCollectionEdition`). */
export const ruleHasEditions = (artist: string, cls: string | null) =>
  artist.toLowerCase() !== "idntt" && RULE_EDITION_CLASSES.some((edition) => edition === cls);

const memberList = z.array(z.string().min(1).max(40)).max(40);

const collectionRuleSchema = z.object({
  kind: z.literal("collection"),
  artist: z.string().min(1).max(40),
  season: z.string().min(1).max(40),
  /** as the indexer stores it, with its suffix: `366Z` */
  collectionNo: z.string().min(1).max(10),
  prio: memberList.max(PRIO_MAX).default([]),
  skipOwned: z.boolean().default(true),
});

const setRuleSchema = z.object({
  kind: z.literal("set"),
  artist: z.string().min(1).max(40),
  /** null is any season */
  season: z.string().min(1).max(40).nullable(),
  class: z.string().min(1).max(40),
  /** empty is any edition */
  editions: z.array(z.number().int().min(1).max(3)).max(3).default([]),
  /** empty is any member */
  members: memberList.default([]),
  skipOwned: z.boolean().default(true),
});

export const listRuleInputSchema = z.discriminatedUnion("kind", [
  collectionRuleSchema,
  setRuleSchema,
]);
export type ListRuleInput = z.infer<typeof listRuleInputSchema>;

/** A saved rule's definition, as `list_rule` holds it. */
export type ListRuleDef = {
  kind: "collection" | "set";
  artist: string;
  season: string | null;
  collectionNo: string | null;
  class: string | null;
  editions: number[];
  members: string[];
  prio: string[];
  skipOwned: boolean;
};

/** The columns of `list_rule` an input writes; the other kind's fields are cleared. */
export function ruleDef(input: ListRuleInput): ListRuleDef {
  if (input.kind === "collection") {
    return {
      kind: "collection",
      artist: input.artist,
      season: input.season,
      collectionNo: input.collectionNo,
      class: null,
      editions: [],
      members: [],
      prio: [...new Set(input.prio)],
      skipOwned: input.skipOwned,
    };
  }
  return {
    kind: "set",
    artist: input.artist,
    season: input.season,
    collectionNo: null,
    class: input.class,
    // an edition the class can't have would match nothing, so it is dropped rather than kept
    editions: ruleHasEditions(input.artist, input.class)
      ? [...new Set(input.editions)].toSorted((a, b) => a - b)
      : [],
    members: [...new Set(input.members)],
    prio: [],
    skipOwned: input.skipOwned,
  };
}

/** The collection fields expansion reads. */
export type RuleCollection = Pick<
  ValidObjekt,
  "slug" | "artist" | "season" | "collectionNo" | "class" | "member" | "onOffline"
>;

/** Whether a rule describes a collection; owned or not, prio aside. Physical cards never match. */
export function ruleCovers(rule: ListRuleDef, c: RuleCollection) {
  if (c.onOffline !== "online" || c.artist !== rule.artist) return false;
  if (rule.season !== null && c.season !== rule.season) return false;
  if (rule.kind === "collection") return c.collectionNo === rule.collectionNo;
  if (c.class !== rule.class) return false;
  if (rule.members.length > 0 && !rule.members.includes(c.member)) return false;
  if (rule.editions.length === 0) return true;
  const edition = getCollectionEdition(c);
  return edition !== null && rule.editions.includes(edition);
}

export type RuleExpansion = {
  /** the collections the rule wants now, in the order given */
  slugs: string[];
  covers: number;
  owned: number;
  canMatch: number;
};

/**
 * What a rule wants: every collection it covers, less the held ones while
 * Skip ones I own is on. A slug is counted once however many copies it has.
 */
export function expandRule(
  rule: ListRuleDef,
  collections: readonly RuleCollection[],
  heldSlugs: ReadonlySet<string>,
): RuleExpansion {
  const covered = [...new Set(collections.filter((c) => ruleCovers(rule, c)).map((c) => c.slug))];
  const owned = covered.filter((slug) => heldSlugs.has(slug)).length;
  const slugs = rule.skipOwned ? covered.filter((slug) => !heldSlugs.has(slug)) : covered;
  return { slugs, covers: covered.length, owned, canMatch: slugs.length };
}

/** Why a rule can't be saved, or null. */
export function ruleProblem(rule: ListRuleDef, expansion: RuleExpansion) {
  if (expansion.covers === 0) return "no_collections" as const;
  if (expansion.covers > RULE_MAX_OBJEKTS) return "too_wide" as const;
  if (rule.skipOwned && expansion.canMatch === 0) return "nothing_to_match" as const;
  return null;
}

const CLASS_SHORT: Record<string, string> = {
  First: "FCO",
  Double: "DCO",
  Special: "SCO",
  Premier: "PCO",
  Motion: "MCO",
  Unit: "UCO",
  Welcome: "WCO",
  Zero: "ZCO",
};

const ORDINAL = ["", "1st", "2nd", "3rd"];

/** `366Z` → `366`: the suffix only says online or offline, and rules are online only. */
const bareNo = (collectionNo: string) => collectionNo.replace(/[A-Z]$/, "");

/** The traders' short name of a collection: `CC366` for Cream02 366. */
export function collectionCode(artist: string, season: string, collectionNo: string) {
  if (artist === "idntt") return `${season} ${bareNo(collectionNo)}`;
  const count = Number(season.slice(-2));
  const code = season.charAt(0).repeat(Number.isFinite(count) && count > 0 ? count : 1);
  return `${code}${bareNo(collectionNo)}`;
}

/** The parts a rule is named by; the web words `members: []` and a null season in its locale. */
export function ruleParts(rule: ListRuleDef) {
  if (rule.kind === "collection") {
    return {
      title: collectionCode(rule.artist, rule.season ?? "", rule.collectionNo ?? ""),
      season: rule.season,
      members: [] as string[],
      prio: rule.prio,
    };
  }
  const cls = rule.class ?? "";
  const editions = rule.editions.map((e) => ORDINAL[e] ?? String(e)).join("/");
  return {
    title: [rule.season, CLASS_SHORT[cls] ?? cls, editions].filter(Boolean).join(" "),
    season: rule.season,
    members: rule.members,
    prio: rule.prio,
  };
}

/** The strip's label: `CC366 · any member`, `Cream02 · FCO · 3rd · any member`. */
export function ruleLabel(
  rule: ListRuleDef,
  words: { anyMember: string; anySeason: string } = {
    anyMember: "any member",
    anySeason: "any season",
  },
) {
  const parts = ruleParts(rule);
  const who = parts.members.length > 0 ? parts.members.join(", ") : words.anyMember;
  if (rule.kind === "collection") return `${parts.title} · ${who}`;
  const cls = rule.class ?? "";
  const editions = rule.editions.map((e) => ORDINAL[e] ?? String(e)).join("/");
  return [rule.season ?? words.anySeason, CLASS_SHORT[cls] ?? cls, editions, who]
    .filter(Boolean)
    .join(" · ");
}

/** One line for share text, export and the Discord format: `any CC366 (prio Lynn)`. */
export function ruleLine(rule: ListRuleDef) {
  const parts = ruleParts(rule);
  const title =
    rule.kind === "set" && rule.season === null ? `any season ${parts.title}` : parts.title;
  const head = parts.members.length > 0 ? `${parts.members.join(", ")} ${title}` : `any ${title}`;
  return parts.prio.length > 0 ? `${head} (prio ${parts.prio.join(", ")})` : head;
}

const slug = z.string().min(1).max(32);
const ruleId = z.number().int().positive();

export const previewRuleInputSchema = z.object({ rule: listRuleInputSchema });
export const listRulesInputSchema = z.object({ slug });
export const addRuleInputSchema = z.object({ slug, rule: listRuleInputSchema });
export const updateRuleInputSchema = z.object({ slug, ruleId, rule: listRuleInputSchema });
export const ruleIdInputSchema = z.object({ slug, ruleId });
