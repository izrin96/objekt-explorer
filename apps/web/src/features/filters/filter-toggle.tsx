import { ArrowsLeftRightIcon, StackSimpleIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import type { FilterSearch } from "./search-schema";
import { useFilters, useSetFilters } from "./use-filters";

/** An on/off filter on the toolbar, pressed while the filter is on. */
export function FilterToggle({
  label,
  icon,
  pressed,
  onPressedChange,
  className,
}: {
  label: string;
  icon?: ReactNode;
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  className?: string;
}) {
  return (
    <Toggle
      variant="outline"
      size="sm"
      pressed={pressed}
      onPressedChange={onPressedChange}
      className={cn("data-pressed:border-foreground data-pressed:text-foreground", className)}
    >
      {/* the sheet stretches its controls with `justify-between`, which would
          otherwise throw the icon and its label to opposite edges */}
      <span className="flex items-center gap-1.5">
        {icon}
        {label}
      </span>
    </Toggle>
  );
}

/** the boolean filters a surface can promote onto its toolbar */
type ToggleField = Extract<keyof FilterSearch, "transferable" | "grouped">;

function FieldToggle({
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
    <FilterToggle
      label={label}
      icon={icon}
      pressed={on}
      onPressedChange={(pressed) => setFilters({ [field]: pressed ? true : undefined })}
      className={className}
    />
  );
}

export function TransferableToggle({ className }: { className?: string }) {
  return (
    <FieldToggle
      field="transferable"
      label={m.filter_transferable()}
      icon={<ArrowsLeftRightIcon />}
      className={className}
    />
  );
}

export function CombineDupsToggle({ className }: { className?: string }) {
  return (
    <FieldToggle
      field="grouped"
      label={m.filter_combine()}
      icon={<StackSimpleIcon />}
      className={className}
    />
  );
}
