import { validOnlineTypes } from "@repo/cosmo/types/common";
import { type ComponentType, useEffect } from "react";

import { useCosmoArtist } from "@/features/artist/cosmo-artist-provider";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { type Facets, groupsOf, type MemberGroup } from "./facets";
import { FilterCollection } from "./filter-collection";
import { ONLINE_TYPE_LABEL } from "./labels";
import { MultiSelect } from "./multi-select";
import type { FilterSearch } from "./search-schema";
import { SingleSelect } from "./single-select";

/** every facet control takes the same props, so the table below can drive both surfaces */
type FacetControlProps = {
  label: string;
  options: readonly string[];
  groups?: readonly MemberGroup[];
  getOptionLabel?: (option: string) => string;
  value: string[];
  onChange: (value: string[]) => void;
  className?: string;
};

/** the URL keys the facet row owns */
export type FacetKey = "artist" | "member" | "season" | "class" | "collection" | "on_offline";

export type FacetValues = Record<FacetKey, string[]>;

/** A facet change; picking artists also drops the members they don't have. */
export type FacetPatch = Partial<FacetValues>;

export const facetValues = (filters: Pick<FilterSearch, FacetKey>): FacetValues => ({
  artist: filters.artist ?? [],
  member: filters.member ?? [],
  season: filters.season ?? [],
  class: filters.class ?? [],
  collection: filters.collection ?? [],
  on_offline: filters.on_offline ?? [],
});

/** `all` is the absence of a value, spelled as one the select can hold */
const ALL = "all";

/** A one-of-N facet in the multi-value shape the table drives: none, or several from an old link, reads as All. */
function SingleFacet({
  label,
  options,
  getOptionLabel,
  value,
  onChange,
  className,
}: FacetControlProps) {
  return (
    <SingleSelect
      label={label}
      options={[
        { value: ALL, label: m.filter_all() },
        ...options.map((option) => ({ value: option, label: getOptionLabel?.(option) ?? option })),
      ]}
      value={value.length === 1 ? value[0]! : ALL}
      defaultValue={ALL}
      onChange={(next) => onChange(next === ALL ? [] : [next])}
      className={className}
    />
  );
}

type FacetDef = {
  key: FacetKey;
  label: () => string;
  options: (facets: Facets) => readonly string[];
  /** Member only: the dropdown groups by artist when several are in scope */
  grouped?: boolean;
  /** what an option reads as, when not its value; `artistTitle` names an artist id */
  optionLabel?: (option: string, artistTitle: (id: string) => string) => string;
  Control: ComponentType<FacetControlProps>;
};

/**
 * The single source of truth for the facet row. Every surface renders from
 * this array twice — inline on `md+` and stacked in the mobile Filters sheet —
 * so a facet added here shows up in both places and on every page.
 */
const FACETS: readonly FacetDef[] = [
  {
    key: "artist",
    label: m.filter_artist,
    options: (f) => f.artists,
    optionLabel: (id, artistTitle) => artistTitle(id),
    Control: MultiSelect,
  },
  {
    key: "member",
    label: m.filter_member,
    options: (f) => f.members,
    grouped: true,
    Control: MultiSelect,
  },
  { key: "season", label: m.filter_season, options: (f) => f.seasons, Control: MultiSelect },
  { key: "class", label: m.filter_class, options: (f) => f.classes, Control: MultiSelect },
  {
    key: "collection",
    label: m.filter_collection_no,
    options: (f) => f.collectionNos,
    Control: FilterCollection,
  },
  {
    key: "on_offline",
    label: m.filter_type,
    options: () => validOnlineTypes,
    optionLabel: (option) => ONLINE_TYPE_LABEL[option as (typeof validOnlineTypes)[number]](),
    Control: SingleFacet,
  },
];

export const FACET_KEYS: readonly FacetKey[] = FACETS.map((facet) => facet.key);

/** the facets a phone keeps on the toolbar; the rest live in the Filters sheet only */
export const QUICK_FACET_KEYS: readonly FacetKey[] = ["artist", "member", "season", "class"];

export type FacetSurface = "inline" | "stacked";

/**
 * A toolbar control that is not one of the facets but still has to be on
 * both surfaces. It goes through the same parity guard as `FACETS`, and
 * declares whether it holds a non-default value so the sheet trigger's badge
 * can count it. A `quick` extra stays on the toolbar below `md` as well.
 */
export type ExtraFacet = {
  key: string;
  active: boolean;
  quick?: boolean;
  Control: ComponentType<{ className?: string }>;
};

/**
 * The default for every `extras` prop. One shared frozen array, because the
 * declared key list is memoised on the array's identity and a fresh `[]` per
 * render would re-run the parity effect forever.
 */
export const NO_EXTRAS: readonly ExtraFacet[] = [];

export function ExtraFacetControls({
  surface,
  extras,
}: {
  surface: FacetSurface;
  extras: readonly ExtraFacet[];
}) {
  return extras.map(({ key, quick, Control }) => (
    <Control
      key={key}
      className={cn(
        surface === "stacked" && "w-full justify-between",
        surface === "inline" && !quick && "max-md:hidden",
      )}
    />
  ));
}

type FacetControlsProps = {
  surface: FacetSurface;
  facets: Facets;
  groups?: readonly MemberGroup[];
  values: FacetValues;
  onChange: (patch: FacetPatch) => void;
  /** no Filters sheet to fold into, as in a picker: every facet stays below `md` */
  noSheet?: boolean;
};

export function FacetControls({
  surface,
  facets,
  groups,
  values,
  onChange,
  noSheet = false,
}: FacetControlsProps) {
  const { getArtist } = useCosmoArtist();
  const artistTitle = (id: string) => getArtist(id)?.title ?? id;
  // picked artists narrow Member to their members
  const memberGroups = groups && groupsOf(groups, values.artist);
  const scoped = memberGroups
    ? { ...facets, members: memberGroups.flatMap((group) => group.members) }
    : facets;

  const change = (key: FacetKey, value: string[]) => {
    if (key !== "artist" || !groups) return onChange({ [key]: value });
    const kept = groupsOf(groups, value).flatMap((group) => group.members);
    onChange({ artist: value, member: values.member.filter((name) => kept.includes(name)) });
  };

  return FACETS.map(({ key, label, options, grouped, optionLabel, Control }) => (
    <Control
      key={key}
      label={label()}
      options={options(scoped)}
      groups={grouped ? memberGroups : undefined}
      getOptionLabel={optionLabel && ((option) => optionLabel(option, artistTitle))}
      value={values[key]}
      onChange={(value) => change(key, value)}
      className={cn(
        surface === "stacked" && "w-full justify-between",
        surface === "inline" && !noSheet && !QUICK_FACET_KEYS.includes(key) && "max-md:hidden",
      )}
    />
  ));
}

/**
 * Dev-only guard against the bug this table exists to prevent: a facet that
 * only ever renders on one of the two surfaces. Each render site declares the
 * keys it hands to `FacetControls`; `useFacetParity` compares the two.
 */
const declared: Partial<Record<FacetSurface, readonly string[]>> = {};

/**
 * `keys` is widened to `string` rather than `FacetKey`: the guard's job is
 * "every control on one surface is on the other", and an extra is exactly the
 * sort of control that would otherwise go missing.
 */
export function useDeclaredFacets(surface: FacetSurface, keys: readonly string[]): void {
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    declared[surface] = keys;
    return () => {
      delete declared[surface];
    };
  }, [surface, keys]);
}

export function useFacetParity(): void {
  // no dep array: parent effects run after every child effect, so this always
  // sees what both surfaces declared on this render
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const inline = declared.inline ?? [];
    const stacked = declared.stacked ?? [];
    const missing = inline.filter((key) => !stacked.includes(key));
    const extra = stacked.filter((key) => !inline.includes(key));
    if (missing.length > 0 || extra.length > 0) {
      console.error(
        `[filters] facet parity broken — mobile is missing [${missing.join(", ")}] and has extra [${extra.join(", ")}]. Render both surfaces from FACETS.`,
      );
    }
  });
}
