import type { ReactNode } from "react";

import { ActiveChips, type ActiveChip, useActiveChips } from "@/features/filters/active-chips";
import {
  FACET_KEYS,
  FacetControls,
  facetValues,
  useDeclaredFacets,
  useFacetParity,
} from "@/features/filters/facet-controls";
import { useScopedFacets } from "@/features/filters/facets";
import { FilterSheet } from "@/features/filters/filter-sheet";
import { ResetButton } from "@/features/filters/reset-button";
import { useCanonicalFilters, useSetFacet, useSetFilters } from "@/features/filters/use-filters";
import { m } from "@/paraglide/messages";

import type { FeedSearch } from "./browse-search";

export function BrowseFilters({
  search,
  slugName,
  filtering,
  onClearSlug,
  onReset,
  postType,
  matching,
  comparedLine,
}: {
  search: FeedSearch;
  slugName: string | undefined;
  filtering: boolean;
  onClearSlug: () => void;
  onReset: () => void;
  /** the Post type menu: last on the facet row, after Reset */
  postType: ReactNode;
  /** after a divider; below `md` they wrap in after Reset */
  matching?: ReactNode;
  comparedLine?: ReactNode;
}) {
  const { facets, groups } = useScopedFacets();
  const filters = useCanonicalFilters();
  const setFilters = useSetFilters();
  const chips = useActiveChips();

  const setFacet = useSetFacet();
  const values = facetValues(filters);

  useDeclaredFacets("inline", FACET_KEYS);
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
        <FilterSheet
          facets={facets}
          groups={groups}
          values={values}
          onChange={setFacet}
          onReset={onReset}
          resetDisabled={nothingToReset}
        />
        <div className="contents">
          <FacetControls
            surface="inline"
            facets={facets}
            groups={groups}
            values={values}
            onChange={setFacet}
          />
          <ResetButton onReset={onReset} disabled={nothingToReset} />
        </div>
        <div className="max-md:order-2 md:order-1">{postType}</div>
        {matching ? (
          <>
            <span aria-hidden className="bg-border h-5 w-px max-md:hidden md:order-2" />
            {matching}
          </>
        ) : null}
      </div>

      {comparedLine}

      <ActiveChips
        chips={[...slugChip, ...chips]}
        onRemove={(chip) => (chip.key === "slug" ? onClearSlug() : setFilters(chip.remove))}
      />
    </>
  );
}
