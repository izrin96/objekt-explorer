import type { ReactNode } from "react";

import { RadioGroupPrimitive, RadioPrimitive } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

/**
 * One of a few, as radios (arrow keys move and pick), drawn like the neutral segmented Tabs
 * of For you's filter: no accent fill on the picked one.
 */
export function SegmentedChoice<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled = false,
  variant = "muted",
  className,
}: {
  label: string;
  options: readonly { value: T; label: string; icon?: ReactNode }[];
  value: T | null;
  onChange: (value: T) => void;
  disabled?: boolean;
  /** `outline` keeps full-contrast edges for a tinted surface, where the muted track reads as disabled */
  variant?: "muted" | "outline";
  className?: string;
}) {
  return (
    <RadioGroupPrimitive
      aria-label={label}
      value={value}
      disabled={disabled}
      onValueChange={(next) => {
        const picked = options.find((option) => option.value === next);
        if (picked) onChange(picked.value);
      }}
      className={cn(
        "flex w-fit items-center",
        variant === "muted" && "bg-muted text-muted-foreground/72 gap-x-0.5 rounded-lg p-0.5",
        variant === "outline" && "gap-2",
        className,
      )}
    >
      {options.map((option) => (
        <RadioPrimitive.Root
          key={option.value}
          value={option.value}
          className={cn(
            "focus-visible:ring-ring flex h-9 cursor-pointer items-center justify-center px-2.5 text-base font-medium whitespace-nowrap transition-[color,background-color] outline-none focus-visible:ring-2 data-disabled:cursor-not-allowed data-disabled:opacity-64 sm:h-8 sm:text-sm",
            variant === "muted" &&
              "hover:text-muted-foreground data-checked:bg-background data-checked:text-foreground dark:data-checked:bg-input rounded-md data-checked:shadow-sm/5",
            variant === "outline" &&
              "border-foreground/40 text-foreground hover:bg-foreground/6 data-checked:border-foreground data-checked:bg-foreground data-checked:text-background gap-1.5 rounded-lg border bg-transparent [&_svg]:size-4 [&_svg]:shrink-0",
          )}
        >
          {option.icon}
          {option.label}
        </RadioPrimitive.Root>
      ))}
    </RadioGroupPrimitive>
  );
}
