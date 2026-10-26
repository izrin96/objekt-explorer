import { FunnelSimpleIcon } from "@phosphor-icons/react";
import type { CollectionFilters } from "@repo/api/schemas/common/filters";
import { type ReactNode, useId, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { FacetControls } from "./facet-controls";
import { useScopedFacets } from "./facets";
import { PickerSearchField } from "./filter-search";
import { ResetButton } from "./reset-button";
import { defaultFilters, type FilterSearch } from "./search-schema";

/** What a picker in a dialog narrows by; empty arrays mean no filter. */
export type PickerFacetFilters = Pick<
  CollectionFilters,
  "artist" | "member" | "season" | "class" | "on_offline" | "collection"
> & {
  search: string;
};

export const NO_PICKER_FILTERS: PickerFacetFilters = {
  search: "",
  artist: [],
  member: [],
  season: [],
  class: [],
  on_offline: [],
  collection: [],
};

const FACET_FIELDS = ["artist", "member", "season", "class", "on_offline", "collection"] as const;

/** How many facets hold a value. */
const pickerFacetCount = (filters: PickerFacetFilters) =>
  FACET_FIELDS.reduce((sum, key) => sum + (filters[key].length > 0 ? 1 : 0), 0);

export const pickerFiltered = (filters: PickerFacetFilters) =>
  filters.search.trim().length > 0 || pickerFacetCount(filters) > 0;

/** For `filterObjekts`, which reads an empty array as "matches nothing". */
export const toFilterSearch = (filters: PickerFacetFilters): FilterSearch => ({
  ...defaultFilters,
  search: filters.search || undefined,
  artist: filters.artist.length > 0 ? filters.artist : undefined,
  member: filters.member.length > 0 ? filters.member : undefined,
  season: filters.season.length > 0 ? filters.season : undefined,
  class: filters.class.length > 0 ? filters.class : undefined,
  on_offline: filters.on_offline.length > 0 ? filters.on_offline : undefined,
  collection: filters.collection.length > 0 ? filters.collection : undefined,
});

/**
 * The filters the pickers share, as the page toolbar draws them. `source` picks where the
 * objekts come from (a list, a profile) and follows the filters; `children` adds a picker's
 * own controls after Reset. `extraActive` counts what those two narrow, for the phone's badge;
 * `pinSource` keeps a source that always holds a choice out of the phone's fold.
 */
export function PickerFilterBar<F extends PickerFacetFilters>({
  filters,
  onChange,
  source,
  children,
  extraActive = 0,
  pinSource = false,
}: {
  filters: F;
  onChange: (next: F) => void;
  source?: ReactNode;
  children?: ReactNode;
  extraActive?: number;
  pinSource?: boolean;
}) {
  const { facets, groups } = useScopedFacets();
  // the search field keeps its own draft, so a reset remounts it to clear the text
  const [searchKey, setSearchKey] = useState(0);
  // below `sm` the controls fold behind one button, so the grid keeps the dialog's height
  const [open, setOpen] = useState(false);
  const foldId = useId();
  const active = pickerFacetCount(filters) + extraActive;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <PickerSearchField key={searchKey} onCommit={(search) => onChange({ ...filters, search })} />
      {pinSource ? source : null}
      <Button
        variant="outline"
        className="gap-1.5 sm:hidden"
        aria-expanded={open}
        aria-controls={foldId}
        onClick={() => setOpen((value) => !value)}
      >
        <FunnelSimpleIcon />
        {m.filter_filters()}
        {active > 0 ? (
          <Badge size="sm" className="bg-accent text-accent-foreground font-mono">
            {active}
          </Badge>
        ) : null}
      </Button>
      <div id={foldId} className={cn("contents", !open && "max-sm:hidden")}>
        <FacetControls
          surface="inline"
          facets={facets}
          groups={groups}
          values={filters}
          onChange={(patch) => onChange({ ...filters, ...patch })}
          noSheet
        />
        {pinSource ? null : source}
        <ResetButton
          disabled={!pickerFiltered(filters)}
          onReset={() => {
            setSearchKey((key) => key + 1);
            onChange({ ...filters, ...NO_PICKER_FILTERS });
          }}
        />
        {children}
      </div>
    </div>
  );
}
