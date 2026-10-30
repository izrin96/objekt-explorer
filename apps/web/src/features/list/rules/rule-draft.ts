import { type ListRuleDef, type ListRuleInput, ruleHasEditions } from "@repo/api/schemas/list-rule";
import type { ValidArtist } from "@repo/cosmo/types/common";

// mirrors the server schema's cap on a collection rule's prio
const PRIO_MAX = 6;

export type RuleDraft = {
  kind: "collection" | "set";
  artist: ValidArtist;
  season: string | null;
  /** digits only; the online suffix is added on save */
  collectionNo: string;
  /** null is any class */
  cls: string | null;
  editions: number[];
  members: string[];
  prio: string[];
  skipOwned: boolean;
};

export function toInput(draft: RuleDraft): ListRuleInput | null {
  const artist = draft.artist.toLowerCase();
  if (draft.kind === "collection") {
    const digits = draft.collectionNo.trim();
    if (!/^\d{3}$/.test(digits) || !draft.season) return null;
    return {
      kind: "collection",
      artist,
      season: draft.season,
      collectionNo: `${digits}Z`,
      prio: draft.prio,
      skipOwned: draft.skipOwned,
    };
  }
  return {
    kind: "set",
    artist,
    season: draft.season,
    class: draft.cls,
    editions: ruleHasEditions(draft.artist, draft.cls) ? draft.editions : [],
    members: draft.members,
    skipOwned: draft.skipOwned,
  };
}

export function fromRule(rule: ListRuleDef, artists: ValidArtist[]): RuleDraft {
  return {
    kind: rule.kind,
    artist: artists.find((a) => a.toLowerCase() === rule.artist) ?? artists[0]!,
    season: rule.season,
    collectionNo: (rule.collectionNo ?? "").replace(/[A-Z]$/, ""),
    cls: rule.kind === "set" ? rule.class : "First",
    editions: rule.editions,
    members: rule.members,
    prio: rule.prio,
    skipOwned: rule.skipOwned,
  };
}

export const toggle = <T>(items: readonly T[], item: T): T[] =>
  items.includes(item) ? items.filter((i) => i !== item) : [...items, item];

export function newDraft(artist: ValidArtist, seasons: readonly string[]): RuleDraft {
  return {
    kind: "set",
    artist,
    season: seasons.at(-1) ?? null,
    collectionNo: "",
    cls: "First",
    editions: [],
    members: [],
    prio: [],
    skipOwned: true,
  };
}

export const collectionDigits = (value: string) => value.replace(/\D/g, "").slice(0, 3);

export const togglePrio = (prio: readonly string[], member: string) =>
  toggle(prio, member).slice(0, PRIO_MAX);
