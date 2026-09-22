import { CaretDownIcon } from "@phosphor-icons/react";

import { buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectGroup,
  SelectGroupLabel,
  SelectItem,
  SelectPopup,
  SelectPrimitive,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import type { MemberGroup } from "./facets";

type MultiSelectProps = {
  label: string;
  options: readonly string[];
  value: string[];
  onChange: (value: string[]) => void;
  /** one group per artist instead of the flat `options`; a single group falls back to flat */
  groups?: readonly MemberGroup[];
  className?: string;
};

/** Raw `SelectPrimitive.Trigger`: the kit's `SelectTrigger` is a form field, not a toolbar button. */
export function MultiSelect({
  label,
  options,
  value,
  onChange,
  groups,
  className,
}: MultiSelectProps) {
  const grouped = groups !== undefined && groups.length > 1;

  return (
    <Select multiple value={value} onValueChange={onChange}>
      <SelectPrimitive.Trigger
        aria-label={label}
        data-active={value.length > 0 || undefined}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "data-active:border-foreground gap-1.5",
          className,
        )}
      >
        <span>
          {label}
          {value.length > 0 && (
            <span className="text-muted-foreground font-mono"> · {value.length}</span>
          )}
        </span>
        <SelectPrimitive.Icon>
          <CaretDownIcon className="size-3.5 opacity-50" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPopup alignItemWithTrigger={false} className="min-w-40">
        {grouped
          ? groups.map((group) => (
              <SelectGroup key={group.artist.id}>
                {/* sticky so the artist stays readable while its members scroll past */}
                <SelectGroupLabel className="bg-popover sticky top-0 z-1 font-mono tracking-wide">
                  {group.artist.title}
                </SelectGroupLabel>
                {group.members.map((member) => (
                  <SelectItem key={member} value={member}>
                    {member}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))
          : options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
      </SelectPopup>
    </Select>
  );
}
