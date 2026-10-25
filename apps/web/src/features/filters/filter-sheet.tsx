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
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import {
  type ExtraFacet,
  ExtraFacetControls,
  FACET_KEYS,
  FacetControls,
  NO_EXTRAS,
  QUICK_FACET_KEYS,
  useDeclaredFacets,
  type FacetPatch,
  type FacetValues,
} from "./facet-controls";
import type { Facets, MemberGroup } from "./facets";
import { ResetButton } from "./reset-button";

type FilterSheetProps = {
  facets: Facets;
  groups?: readonly MemberGroup[];
  values: FacetValues;
  onChange: (patch: FacetPatch) => void;
  extras?: readonly ExtraFacet[];
  /** the long-tail fields, plus toolbar controls this surface hides below `md` */
  children?: ReactNode;
  extraCount?: number;
  onReset?: () => void;
  resetDisabled?: boolean;
};

function FilterSheetTrigger({ count, className }: { count: number; className?: string }) {
  return (
    <SheetTrigger
      render={<Button variant="outline" size="sm" className={cn("gap-1.5", className)} />}
    >
      <FunnelSimpleIcon />
      {m.filter_filters()}
      {count > 0 && (
        <Badge size="sm" className="bg-accent text-accent-foreground font-mono">
          {count}
        </Badge>
      )}
    </SheetTrigger>
  );
}

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
  resetDisabled = false,
}: FilterSheetProps) {
  const [open, setOpen] = useState(false);
  const declaredKeys = useMemo(() => [...FACET_KEYS, ...extras.map((e) => e.key)], [extras]);
  useDeclaredFacets("stacked", declaredKeys);

  // the badge counts only what the toolbar hides below `md`
  const count =
    FACET_KEYS.reduce(
      (sum, key) => sum + (!QUICK_FACET_KEYS.includes(key) && values[key].length > 0 ? 1 : 0),
      0,
    ) +
    extras.reduce((sum, extra) => sum + (!extra.quick && extra.active ? 1 : 0), 0) +
    extraCount;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <FilterSheetTrigger count={count} className="md:hidden" />
      {/* `SheetPopup` renders its own backdrop, so the portal is the only way to reach it */}
      <SheetPopup
        side="right"
        className="flex max-w-80 flex-col"
        portalProps={{ className: "**:data-[slot=sheet-backdrop]:backdrop-blur-none" }}
      >
        <SheetHeader>
          <SheetTitle className="font-display text-base">{m.filter_filters()}</SheetTitle>
          <SheetDescription className="sr-only">{m.filter_sheet_description()}</SheetDescription>
        </SheetHeader>
        <SheetPanel className="flex flex-col gap-4">
          <div className="flex flex-col gap-4">
            <ExtraFacetControls surface="stacked" extras={extras} />
            <FacetControls
              surface="stacked"
              facets={facets}
              groups={groups}
              values={values}
              onChange={onChange}
            />
          </div>
          {children}
        </SheetPanel>
        <SheetFooter className="flex-row justify-end gap-1.5">
          {onReset && <ResetButton onReset={onReset} disabled={resetDisabled} />}
          <Button size="sm" onClick={() => setOpen(false)}>
            {m.filter_done()}
          </Button>
        </SheetFooter>
      </SheetPopup>
    </Sheet>
  );
}
