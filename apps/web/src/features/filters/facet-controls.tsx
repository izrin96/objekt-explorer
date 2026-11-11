import { validOnlineTypes } from "@repo/cosmo/types/common";
import type { ComponentType } from "react";

import { useCosmoArtist } from "@/features/artist/use-cosmo-artist";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import {
  type ExtraFacet,
  FACET_KEYS,
  type FacetKey,
  type FacetPatch,
  type FacetSurface,
  type FacetValues,
  QUICK_FACET_KEYS,
} from "./facet-keys";
import { type Facets, groupsOf, type MemberGroup } from "./facets";
import { FilterCollection } from "./filter-collection";
import { ONLINE_TYPE_LABEL } from "./labels";
import { MultiSelect } from "./multi-select";
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
  label: () => string;
  options: (facets: Facets) => readonly string[];
  /** Member only: the dropdown groups by artist when several are in scope */
  grouped?: boolean;
  /** what an option reads as, when not its value; `artistTitle` names an artist id */
  optionLabel?: (option: string, artistTitle: (id: string) => string) => string;
  Control: ComponentType<FacetControlProps>;
};

/**
 * The single source of truth for the facet row, keyed by `FACET_KEYS`. Every surface renders from
 * this table twice — inline on `md+` and stacked in the mobile Filters sheet —
 * so a facet added here shows up in both places and on every page.
 */
const FACETS: Record<FacetKey, FacetDef> = {
  artist: {
    label: m.filter_artist,
    options: (f) => f.artists,
    optionLabel: (id, artistTitle) => artistTitle(id),
    Control: MultiSelect,
  },
  member: {
    label: m.filter_member,
    options: (f) => f.members,
    grouped: true,
    Control: MultiSelect,
  },
  season: { label: m.filter_season, options: (f) => f.seasons, Control: MultiSelect },
  class: { label: m.filter_class, options: (f) => f.classes, Control: MultiSelect },
  collection: {
    label: m.filter_collection_no,
    options: (f) => f.collectionNos,
    Control: FilterCollection,
  },
  on_offline: {
    label: m.filter_type,
    options: () => validOnlineTypes,
    optionLabel: (option) => ONLINE_TYPE_LABEL[option as (typeof validOnlineTypes)[number]](),
    Control: SingleFacet,
  },
};

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

  return FACET_KEYS.map((key) => {
    const { label, options, grouped, optionLabel, Control } = FACETS[key];
    return (
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
    );
  });
}
