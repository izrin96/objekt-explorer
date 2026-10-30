import type { filterDataOutputSchema } from "@repo/api/schemas/config";
import { type ListRuleDef, type ListRuleInput, ruleHasEditions } from "@repo/api/schemas/list-rule";
import type { ValidArtist } from "@repo/cosmo/types/common";
import type * as z from "zod";

import { m } from "@/paraglide/messages";

// mirrors the server schema's cap on a collection rule's prio
const PRIO_MAX = 6;

export const ANY = "__any__";
const ORDINAL = ["", "1st", "2nd", "3rd"];

type FilterMaps = Pick<z.infer<typeof filterDataOutputSchema>, "seasonsMap" | "classesMap">;
type Option = { value: string; label: string };

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

export const editionLabel = (edition: number) => ORDINAL[edition] ?? String(edition);

export const seasonsOf = (data: FilterMaps | undefined, artist: string): string[] =>
  data?.seasonsMap.find((s) => s.artistId === artist)?.seasons ?? [];

export const classesOf = (data: FilterMaps | undefined, artist: string): string[] =>
  data?.classesMap.find((c) => c.artistId === artist)?.classes ?? [];

// a collection rule has no Any season, so an empty season there falls back to the newest
export const seasonFor = (
  kind: RuleDraft["kind"],
  season: string | null,
  seasons: readonly string[],
) => (kind === "collection" && season === null ? (seasons.at(-1) ?? null) : season);

export function kindPatch(
  draft: RuleDraft,
  kind: RuleDraft["kind"],
  seasons: readonly string[],
): Partial<RuleDraft> {
  return { kind, season: seasonFor(kind, draft.season, seasons) };
}

export function artistPatch(
  draft: RuleDraft,
  artist: ValidArtist,
  next: { seasons: readonly string[]; classes: readonly string[] },
): Partial<RuleDraft> {
  // a number, class or edition of one artist rarely exists for another
  return {
    artist,
    season: seasonFor(draft.kind, null, next.seasons),
    collectionNo: "",
    cls:
      draft.cls === null || next.classes.includes(draft.cls)
        ? draft.cls
        : (next.classes[0] ?? draft.cls),
    editions: [],
    members: [],
    prio: [],
  };
}

export function classOptions(classes: readonly string[]): Option[] {
  return [
    { value: ANY, label: m.rule_any_class() },
    ...classes.map((cls) => ({ value: cls, label: cls })),
  ];
}

export function seasonOptions(kind: RuleDraft["kind"], seasons: readonly string[]): Option[] {
  return [
    ...(kind === "set" ? [{ value: ANY, label: m.rule_any_season() }] : []),
    ...seasons.toReversed().map((season) => ({ value: season, label: season })),
  ];
}

export function previewIsCurrent(
  input: ListRuleInput | null,
  deferred: ListRuleInput | null,
  placeholder: boolean,
): boolean {
  // counts for another rule (the deferred one still catching up, or the previous result kept
  // while the new one loads) say nothing about this one
  return input !== null && !placeholder && JSON.stringify(deferred) === JSON.stringify(input);
}
