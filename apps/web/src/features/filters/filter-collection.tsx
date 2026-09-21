import { CaretDownIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useRef } from "react";

import { buttonVariants } from "@/components/ui/button";
import {
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
  ComboboxPrimitive,
} from "@/components/ui/combobox";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

/** `229 z` → `229z`: case, spaces and punctuation are dropped on both sides */
const squash = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

type FilterCollectionProps = {
  label: string;
  /** raw numbers (`229Z`), not the season-coded short form */
  options: readonly string[];
  value: string[];
  onChange: (value: string[]) => void;
  className?: string;
};

/**
 * Base UI `Combobox` in its select-shaped variant — trigger as a button, input
 * inside the popup — so the toolbar keeps its row of identical buttons instead
 * of growing a chips field.
 */
export function FilterCollection({
  label,
  options,
  value,
  onChange,
  className,
}: FilterCollectionProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <ComboboxPrimitive.Root
      multiple
      autoHighlight
      items={options}
      filter={(no: string, query: string) => squash(no).includes(squash(query))}
      value={value}
      onValueChange={onChange}
    >
      <ComboboxPrimitive.Trigger
        ref={triggerRef}
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
        <ComboboxPrimitive.Icon>
          <CaretDownIcon className="size-3.5 opacity-50" />
        </ComboboxPrimitive.Icon>
      </ComboboxPrimitive.Trigger>

      {/* initialFocus: without it the popup opens with focus left behind on the
          page, and Base UI closes it again on the next tick */}
      <ComboboxPopup anchor={triggerRef} align="start" className="w-56" initialFocus={inputRef}>
        <div className="relative border-b">
          <MagnifyingGlassIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <ComboboxPrimitive.Input
            ref={inputRef}
            placeholder={m.filter_collection_search()}
            className="h-9 w-full bg-transparent pr-2.5 pl-8 text-[13px] outline-none"
          />
        </div>

        {/* Empty is a sibling of the list, not a child: a list whose only child
            is the render function is what types the function through */}
        <ComboboxEmpty>{m.filter_collection_empty()}</ComboboxEmpty>
        <ComboboxList>
          {(no: string) => (
            <ComboboxItem key={no} value={no} className="font-mono text-[13px]">
              {no}
            </ComboboxItem>
          )}
        </ComboboxList>

        {value.length > 0 && (
          <div className="text-muted-foreground flex items-center justify-between border-t px-2.5 py-1.5 text-[12px]">
            <span>{m.filter_picked_count({ count: value.length })}</span>
            <button
              type="button"
              onClick={() => onChange([])}
              className="hover:text-foreground px-1"
            >
              {m.filter_clear()}
            </button>
          </div>
        )}
      </ComboboxPopup>
    </ComboboxPrimitive.Root>
  );
}
