import { CaretDownIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { Select, SelectItem, SelectPopup, SelectPrimitive } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { toolbarTrigger } from "./toolbar-trigger";

type SingleOption<T extends string> = {
  value: T;
  label: ReactNode;
  /** the plain text of a `label` that is more than text: the trigger shows it, and typing finds it */
  text?: string;
  disabled?: boolean;
  /** a short muted line under the label, such as why the option is disabled */
  hint?: string;
};

type SingleSelectProps<T extends string> = {
  label: string;
  options: readonly SingleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** the value that counts as "nothing picked"; the trigger stays plain on it */
  defaultValue: T;
  /** name the value on the trigger even when it is the default */
  showValue?: boolean;
  className?: string;
};

/** One-of-N sibling of `MultiSelect`, so a single-value control has a facet's shape. */
export function SingleSelect<T extends string>({
  label,
  options,
  value,
  onChange,
  defaultValue,
  showValue = false,
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
        className={cn(toolbarTrigger, className)}
      >
        <span>
          {label}
          {(active || showValue) && (
            <span className="text-muted-foreground"> · {picked?.text ?? picked?.label}</span>
          )}
        </span>
        <SelectPrimitive.Icon>
          <CaretDownIcon className="size-3.5 opacity-50" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPopup alignItemWithTrigger={false} className="min-w-40">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} label={o.text} disabled={o.disabled}>
            {o.hint ? (
              <span className="flex flex-col">
                {o.label}
                <span className="text-foreground text-xs">{o.hint}</span>
              </span>
            ) : (
              o.label
            )}
          </SelectItem>
        ))}
      </SelectPopup>
    </Select>
  );
}
