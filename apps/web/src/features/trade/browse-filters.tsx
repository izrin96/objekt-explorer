import { useMemo } from "react";

import { ActiveChips, type ActiveChip, useActiveChips } from "@/features/filters/active-chips";
import {
  type ExtraFacet,
  ExtraFacetControls,
  FACET_KEYS,
  FacetControls,
  type FacetKey,
  useDeclaredFacets,
  useFacetParity,
} from "@/features/filters/facet-controls";
import { useScopedFacets } from "@/features/filters/facets";
import { QuickFilters } from "@/features/filters/filter-bar";
import { FilterSheet } from "@/features/filters/filter-sheet";
import { OnlineFilter } from "@/features/filters/online-filter";
import { ResetButton } from "@/features/filters/reset-button";
import { useCanonicalFilters, useSetFilters } from "@/features/filters/use-filters";
import { m } from "@/paraglide/messages";

import type { BrowseSearch } from "./browse-search";

export function BrowseFilters({
  search,
  slugName,
  filtering,
  onClearSlug,
  onReset,
}: {
  search: BrowseSearch;
  slugName: string | undefined;
  filtering: boolean;
  onClearSlug: () => void;
  onReset: () => void;
}) {
  const { facets, groups } = useScopedFacets();
  const filters = useCanonicalFilters();
  const setFilters = useSetFilters();
  const chips = useActiveChips();

  const setFacet = (key: FacetKey, value: string[]) =>
    setFilters({ [key]: value.length > 0 ? value : undefined });

  const values = {
    artist: filters.artist ?? [],
    member: filters.member ?? [],
    season: filters.season ?? [],
    class: filters.class ?? [],
    collection: filters.collection ?? [],
  };

  const extras = useMemo<ExtraFacet[]>(
    () => [
      { key: "on_offline", active: (filters.on_offline?.length ?? 0) > 0, Control: OnlineFilter },
    ],
    [filters.on_offline],
  );

  const declaredKeys = useMemo(() => [...FACET_KEYS, ...extras.map((e) => e.key)], [extras]);
  useDeclaredFacets("inline", declaredKeys);
  useFacetParity();

  const nothingToReset = !filtering;

  const slugChip: ActiveChip[] =
    search.slug && slugName
      ? [
          {
            key: "slug",
            label: `${m.trade_collection_chip()}: ${slugName}`,
            name: m.trade_collection_chip(),
            value: slugName,
            mono: slugName === search.slug,
            remove: {},
          },
        ]
      : [];

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <QuickFilters>
          <FilterSheet
            facets={facets}
            groups={groups}
            values={values}
            onChange={setFacet}
            extras={extras}
            onReset={onReset}
            resetDisabled={nothingToReset}
          />
          <ExtraFacetControls surface="inline" extras={extras} />
          <FacetControls
            surface="inline"
            facets={facets}
            groups={groups}
            values={values}
            onChange={setFacet}
          />
          <ResetButton onReset={onReset} disabled={nothingToReset} />
        </QuickFilters>
      </div>

      <ActiveChips
        chips={[...slugChip, ...chips]}
        onRemove={(chip) => (chip.key === "slug" ? onClearSlug() : setFilters(chip.remove))}
      />
    </>
  );
}
