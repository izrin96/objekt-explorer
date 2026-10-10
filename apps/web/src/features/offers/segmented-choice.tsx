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
  className,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  disabled?: boolean;
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
        "bg-muted text-muted-foreground/72 flex w-fit items-center gap-x-0.5 rounded-lg p-0.5",
        className,
      )}
    >
      {options.map((option) => (
        <RadioPrimitive.Root
          key={option.value}
          value={option.value}
          className="hover:text-muted-foreground focus-visible:ring-ring data-checked:bg-background data-checked:text-foreground dark:data-checked:bg-input flex h-9 cursor-pointer items-center justify-center rounded-md px-2.5 text-base font-medium whitespace-nowrap transition-[color,background-color] outline-none focus-visible:ring-2 data-checked:shadow-sm/5 data-disabled:cursor-not-allowed data-disabled:opacity-64 sm:h-8 sm:text-sm"
        >
          {option.label}
        </RadioPrimitive.Root>
      ))}
    </RadioGroupPrimitive>
  );
}
