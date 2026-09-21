import { type ComponentType, type ReactNode, useEffect } from "react";

import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import type { Facets, MemberGroup } from "./facets";
import { FilterCollection } from "./filter-collection";
import { MultiSelect } from "./multi-select";

/** every facet control takes the same props, so the table below can drive both surfaces */
export type FacetControlProps = {
  label: string;
  options: readonly string[];
  groups?: readonly MemberGroup[];
  value: string[];
  onChange: (value: string[]) => void;
  className?: string;
};

/** the URL keys the facet row owns */
export type FacetKey = "artist" | "member" | "season" | "class" | "collection";

export type FacetValues = Record<FacetKey, string[]>;

type FacetDef = {
  key: FacetKey;
  label: () => string;
  options: (facets: Facets) => readonly string[];
  /** Member only: the dropdown groups by artist when several are in scope */
  grouped?: boolean;
  Control: ComponentType<FacetControlProps>;
};

/**
 * The single source of truth for the facet row. Every surface renders from
 * this array twice — inline on `md+` and stacked in the mobile Filters sheet —
 * so a facet added here shows up in both places and on every page.
 */
export const FACETS: readonly FacetDef[] = [
  { key: "artist", label: m.filter_artist, options: (f) => f.artists, Control: MultiSelect },
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
];

export const FACET_KEYS: readonly FacetKey[] = FACETS.map((facet) => facet.key);

export type FacetSurface = "inline" | "stacked";

/**
 * A toolbar control that is not one of the five facets but still has to be on
 * both surfaces. It goes through the same parity guard as `FACETS`, and
 * declares whether it holds a non-default value so the sheet trigger's badge
 * can count it.
 */
export type ExtraFacet = {
  key: string;
  label: string;
  active: boolean;
  Control: ComponentType<{ className?: string }>;
};

/**
 * The default for every `extras` prop. One shared frozen array, because the
 * declared key list is memoised on the array's identity and a fresh `[]` per
 * render would re-run the parity effect forever.
 */
export const NO_EXTRAS: readonly ExtraFacet[] = [];

function forSurface(surface: FacetSurface, key: string, label: string, control: ReactNode) {
  if (surface === "inline") return control;
  return (
    <div key={key} className="flex min-w-0 flex-col gap-1.5">
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
      {control}
    </div>
  );
}

export function ExtraFacetControls({
  surface,
  extras,
  controlClassName,
}: {
  surface: FacetSurface;
  extras: readonly ExtraFacet[];
  controlClassName?: string;
}) {
  return extras.map(({ key, label, Control }) =>
    forSurface(
      surface,
      key,
      label,
      <Control
        key={key}
        className={cn(surface === "stacked" && "w-full justify-between", controlClassName)}
      />,
    ),
  );
}

type FacetControlsProps = {
  surface: FacetSurface;
  facets: Facets;
  groups?: readonly MemberGroup[];
  values: FacetValues;
  onChange: (key: FacetKey, value: string[]) => void;
  /** defaults to every facet; a surface that narrows it trips the dev parity guard */
  keys?: readonly FacetKey[];
  /** merged into every control, e.g. the inline row's `max-md:hidden` */
  controlClassName?: string;
};

export function FacetControls({
  surface,
  facets,
  groups,
  values,
  onChange,
  keys = FACET_KEYS,
  controlClassName,
}: FacetControlsProps) {
  return FACETS.filter((def) => keys.includes(def.key)).map(
    ({ key, label, options, grouped, Control }) =>
      forSurface(
        surface,
        key,
        label(),
        <Control
          key={key}
          label={label()}
          options={options(facets)}
          groups={grouped ? groups : undefined}
          value={values[key]}
          onChange={(value) => onChange(key, value)}
          className={cn(surface === "stacked" && "w-full justify-between", controlClassName)}
        />,
      ),
  );
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
