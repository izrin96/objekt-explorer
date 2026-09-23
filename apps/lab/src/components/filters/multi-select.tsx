import { CaretDownIcon } from "@phosphor-icons/react";

import type { MemberGroup } from "@/components/filters/facets";
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

type MultiSelectProps = {
  label: string;
  options: readonly string[];
  value: string[];
  onChange: (value: string[]) => void;
  /**
   * Render the list grouped, one `Select.Group` per artist, instead of the
   * flat `options` list. A single group carries no information, so its label
   * is dropped and the list falls back to flat.
   */
  groups?: readonly MemberGroup[];
  className?: string;
};

/**
 * Multi-select facet built on cnippet/Base UI `Select` with `multiple`.
 * Trigger reads "Member" or "Member · 2" like the mockup's filter buttons.
 * Uses the raw `SelectPrimitive.Trigger` because cnippet's `SelectTrigger`
 * is styled as a full-width form field, not a toolbar button.
 */
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
          "data-active:border-foreground gap-1.5 text-[13px]",
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
              <SelectGroup key={group.artist}>
                {/* sticky so the artist stays readable while its members scroll past */}
                <SelectGroupLabel className="bg-popover sticky top-0 z-1 font-mono tracking-wide">
                  {group.artist}
                </SelectGroupLabel>
                {group.members.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))
          : options.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
      </SelectPopup>
    </Select>
  );
}
