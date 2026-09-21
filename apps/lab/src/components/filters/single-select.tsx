import { CaretDownIcon } from "@phosphor-icons/react";

import { buttonVariants } from "@/components/ui/button";
import { Select, SelectItem, SelectPopup, SelectPrimitive } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type SingleOption<T extends string> = { value: T; label: string };

type SingleSelectProps<T extends string> = {
  label: string;
  options: readonly SingleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** the value that counts as "nothing picked"; the trigger stays plain on it */
  defaultValue: T;
  className?: string;
};

/**
 * One-of-N sibling of `MultiSelect`, on the same Base UI `Select` and the same
 * toolbar-button trigger, so a single-value control cannot be told apart from
 * a facet by its shape. `apps/website` builds its Event control from a `Menu`
 * in `selectionMode="single"` instead — a Select is the same interaction with
 * a value the trigger can read, which is what lets the trigger show the pick
 * (`Event · Sent`) the way the facets show their count.
 */
export function SingleSelect<T extends string>({
  label,
  options,
  value,
  onChange,
  defaultValue,
  className,
}: SingleSelectProps<T>) {
  const active = value !== defaultValue;
  const picked = options.find((o) => o.value === value);

  return (
    /* Base UI types the callback as `T | null` — a Select can be cleared even
       with no clear affordance on it — and "nothing picked" here is a real
       value rather than an absence, so a null lands back on the default */
    <Select value={value} onValueChange={(next) => onChange(next ?? defaultValue)}>
      <SelectPrimitive.Trigger
        aria-label={label}
        data-active={active || undefined}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "data-active:border-foreground gap-1.5 text-[13px]",
          className,
        )}
      >
        <span>
          {label}
          {active && <span className="text-muted-foreground"> · {picked?.label}</span>}
        </span>
        <SelectPrimitive.Icon>
          <CaretDownIcon className="size-3.5 opacity-50" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPopup alignItemWithTrigger={false} className="min-w-40">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectPopup>
    </Select>
  );
}
