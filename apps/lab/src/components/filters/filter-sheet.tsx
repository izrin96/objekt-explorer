import { FunnelSimpleIcon } from "@phosphor-icons/react";
import { type ReactNode, useMemo, useState } from "react";

import {
  type ExtraFacet,
  ExtraFacetControls,
  FACET_KEYS,
  FacetControls,
  NO_EXTRAS,
  useDeclaredFacets,
  type FacetKey,
  type FacetValues,
} from "@/components/filters/facet-controls";
import type { Facets, MemberGroup } from "@/components/filters/facets";
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

type FilterSheetProps = {
  facets: Facets;
  groups?: readonly MemberGroup[];
  values: FacetValues;
  onChange: (key: FacetKey, value: string[]) => void;
  /** toolbar controls outside the facet table that belong on both surfaces */
  extras?: readonly ExtraFacet[];
  /** anything this surface also hides below `md`: long-tail switches, columns… */
  children?: ReactNode;
  /** added to the trigger badge on top of the number of picked facet values */
  extraCount?: number;
  onReset?: () => void;
};

/**
 * Below `md` the facet row does not fit in the toolbar, so it moves in here.
 * The facets come from the same `FACETS` table the inline row renders from —
 * that is the whole point of the table, and `useDeclaredFacets` makes a
 * mismatch between the two surfaces a console error in dev.
 *
 * The keys are declared here rather than inside `FacetControls`: Base UI
 * unmounts a sheet's popup when it closes, so the inner controls are only
 * mounted while the sheet is open, but the guard has to hold at all times.
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

  const n =
    keys.reduce((sum, key) => sum + (values[key].length > 0 ? 1 : 0), 0) +
    extras.reduce((sum, e) => sum + (e.active ? 1 : 0), 0) +
    extraCount;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="outline" size="sm" className="gap-1.5 text-[13px] md:hidden" />}
      >
        <FunnelSimpleIcon />
        Filters
        {n > 0 && (
          <Badge size="sm" className="bg-accent text-accent-foreground font-mono">
            {n}
          </Badge>
        )}
      </SheetTrigger>
      <SheetPopup side="right" className="flex max-w-80 flex-col">
        <SheetHeader>
          <SheetTitle className="font-display text-[15px]">Filters</SheetTitle>
          <SheetDescription className="sr-only">
            Every facet the toolbar shows on a wider screen
          </SheetDescription>
        </SheetHeader>
        <SheetPanel className="flex flex-col gap-4">
          {/* extras lead on both surfaces, the way the website's TradesFilter
              puts its Event control ahead of the facet row */}
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
              Reset
            </Button>
          )}
          <Button size="sm" onClick={() => setOpen(false)}>
            Done
          </Button>
        </SheetFooter>
      </SheetPopup>
    </Sheet>
  );
}
