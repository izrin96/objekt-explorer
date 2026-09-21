import { FunnelSimpleIcon } from "@phosphor-icons/react";
import { type ReactNode, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { m } from "@/paraglide/messages";

import {
  type ExtraFacet,
  ExtraFacetControls,
  FACET_KEYS,
  FacetControls,
  NO_EXTRAS,
  useDeclaredFacets,
  type FacetKey,
  type FacetValues,
} from "./facet-controls";
import type { Facets, MemberGroup } from "./facets";

type FilterSheetProps = {
  facets: Facets;
  groups?: readonly MemberGroup[];
  values: FacetValues;
  onChange: (key: FacetKey, value: string[]) => void;
  extras?: readonly ExtraFacet[];
  /** anything this surface also hides below `md`: long-tail switches, columns… */
  children?: ReactNode;
  extraCount?: number;
  onReset?: () => void;
};

/**
 * The keys are declared here rather than inside `FacetControls`: Base UI
 * unmounts a sheet's popup when it closes, so the inner controls only exist
 * while the sheet is open, but the parity guard has to hold at all times.
 */
export function FilterSheet({
  facets,
  groups,
  values,
  onChange,
  extras = NO_EXTRAS,
  children,
  extraCount = 0,
  onReset,
}: FilterSheetProps) {
  const [open, setOpen] = useState(false);
  const keys = FACET_KEYS;
  const declaredKeys = useMemo(() => [...keys, ...extras.map((e) => e.key)], [keys, extras]);
  useDeclaredFacets("stacked", declaredKeys);

  const count =
    keys.reduce((sum, key) => sum + (values[key].length > 0 ? 1 : 0), 0) +
    extras.reduce((sum, extra) => sum + (extra.active ? 1 : 0), 0) +
    extraCount;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="outline" size="sm" className="gap-1.5 text-[13px] md:hidden" />}
      >
        <FunnelSimpleIcon />
        {m.filter_filters()}
        {count > 0 && (
          <Badge size="sm" className="bg-accent text-accent-foreground font-mono">
            {count}
          </Badge>
        )}
      </SheetTrigger>
      <SheetPopup side="right" className="flex max-w-80 flex-col">
        <SheetHeader>
          <SheetTitle className="font-display text-[15px]">{m.filter_filters()}</SheetTitle>
          <SheetDescription className="sr-only">{m.filter_sheet_description()}</SheetDescription>
        </SheetHeader>
        <SheetPanel className="flex flex-col gap-4">
          <ExtraFacetControls surface="stacked" extras={extras} />
          <FacetControls
            surface="stacked"
            facets={facets}
            groups={groups}
            values={values}
            onChange={onChange}
            keys={keys}
          />
          {children}
        </SheetPanel>
        <SheetFooter className="flex-row justify-end gap-1.5">
          {onReset && (
            <Button variant="outline" size="sm" onClick={onReset}>
              {m.filter_reset_filter()}
            </Button>
          )}
          <Button size="sm" onClick={() => setOpen(false)}>
            {m.filter_done()}
          </Button>
        </SheetFooter>
      </SheetPopup>
    </Sheet>
  );
}
