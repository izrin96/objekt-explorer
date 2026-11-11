import { FunnelSimpleIcon } from "@phosphor-icons/react";
import { type ReactNode, useId, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { FacetControls } from "./facet-controls";
import { useScopedFacets } from "./facets";
import { PickerSearchField } from "./filter-search";
import {
  NO_PICKER_FILTERS,
  type PickerFacetFilters,
  pickerFacetCount,
  pickerFiltered,
} from "./picker-filters";
import { ResetButton } from "./reset-button";

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
          <Badge size="sm" className="bg-accent text-accent-foreground">
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
