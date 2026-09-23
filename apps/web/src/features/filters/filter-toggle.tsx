import { ArrowsLeftRightIcon, StackSimpleIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import type { FilterSearch } from "./search-schema";
import { useFilters, useSetFilters } from "./use-filters";

/** the boolean filters a surface can promote out of the popover onto its toolbar */
type ToggleField = Extract<keyof FilterSearch, "transferable" | "grouped">;

function FilterToggle({
  field,
  label,
  icon,
  className,
}: {
  field: ToggleField;
  label: string;
  icon: ReactNode;
  className?: string;
}) {
  const on = useFilters((f) => f[field] === true);
  const setFilters = useSetFilters();

  return (
    <Button
      variant="outline"
      size="sm"
      aria-pressed={on}
      className={cn("aria-pressed:border-foreground", className)}
      onClick={() => setFilters({ [field]: on ? undefined : true })}
    >
      {/* the sheet stretches its controls with `justify-between`, which would
          otherwise throw the icon and its label to opposite edges */}
      <span className="flex items-center gap-1.5">
        {icon}
        {label}
      </span>
    </Button>
  );
}

export function TransferableToggle({ className }: { className?: string }) {
  return (
    <FilterToggle
      field="transferable"
      label={m.filter_transferable()}
      icon={<ArrowsLeftRightIcon />}
      className={className}
    />
  );
}

export function CombineDupsToggle({ className }: { className?: string }) {
  return (
    <FilterToggle
      field="grouped"
      label={m.filter_combine()}
      icon={<StackSimpleIcon />}
      className={className}
    />
  );
}
