import { CaretDownIcon, XIcon } from "@phosphor-icons/react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { canonicalHex } from "./canonical-hex";
import { FilterColorPicker } from "./color-picker";
import { COLOR_SWATCHES } from "./facets";
import { COLOR_SENSITIVITY_RANGE, DEFAULT_COLOR_SENSITIVITY } from "./search-schema";
import { toolbarTrigger } from "./toolbar-trigger";
import { useFilters, useSetFilters } from "./use-filters";

/** what the picker shows while no colour is set; not a swatch, since picking the colour already shown is a no-op */
const UNSET_COLOR = "#3b82f6";

/**
 * `onValueChange` fires on every pointer move across the saturation plane, so
 * it reaches the URL through a debounce; each commit re-filters the catalogue.
 * The picker follows `draft` at once: fed the lagging URL value, it would
 * re-seed from it and snap the thumb back mid-drag. A URL change the picker
 * did not write (Clear, back) replaces the draft.
 */
function ColorControls() {
  const color = useFilters((f) => f.color) ?? undefined;
  const colorSensitivity = useFilters((f) => f.colorSensitivity);
  const setFilters = useSetFilters();
  const sensitivityId = useId();
  const [draft, setDraft] = useState(color);
  const [written, setWritten] = useState(color);
  const [seenColor, setSeenColor] = useState(color);
  if (color !== seenColor) {
    setSeenColor(color);
    if (color !== written) {
      setDraft(color);
      setWritten(color);
    }
  }
  const writeColor = useDebouncedCallback((hex: string) => {
    setWritten(hex);
    setFilters({ color: hex });
  }, 60);
  const sensitivity = colorSensitivity ?? DEFAULT_COLOR_SENSITIVITY;

  return (
    <div className="flex flex-col gap-2">
      <FilterColorPicker
        value={canonicalHex(draft) ?? UNSET_COLOR}
        swatches={COLOR_SWATCHES}
        onValueChange={(hex) => {
          setDraft(hex);
          writeColor(hex);
        }}
      />
      {color !== undefined && (
        <>
          <div className="flex h-6 items-center justify-between gap-3">
            <Label id={sensitivityId} render={<span />} className="font-medium">
              {m.filter_color_sensitivity()}
            </Label>
            <span className="text-muted-foreground text-xs tabular-nums">{sensitivity}</span>
          </div>
          <Slider
            aria-labelledby={sensitivityId}
            /* names the hidden range input the Base UI thumb renders; without it
               devtools reports a form field with no id or name */
            name="colorSensitivity"
            className="px-0.5 pb-1"
            min={COLOR_SENSITIVITY_RANGE.min}
            max={COLOR_SENSITIVITY_RANGE.max}
            step={1}
            value={sensitivity}
            onValueChange={(value) => {
              const next = typeof value === "number" ? value : (value[0] ?? sensitivity);
              // the URL carries the sensitivity only once it is off the default
              setFilters({
                colorSensitivity: next === DEFAULT_COLOR_SENSITIVITY ? undefined : next,
              });
            }}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // a write still pending would put the colour back after the clear
              writeColor.cancel();
              setFilters({ color: undefined, colorSensitivity: undefined });
            }}
          >
            <XIcon />
            {m.filter_clear_color()}
          </Button>
        </>
      )}
    </div>
  );
}

/** the picked colour as a dot and its hex, or "All" */
function ColorValue({ color }: { color: string | undefined }) {
  if (color === undefined) return m.filter_all();
  return (
    <>
      <span
        aria-hidden="true"
        className="ring-foreground/15 size-3.5 rounded-full ring-1"
        style={{ backgroundColor: color }}
      />
      <span className="font-mono text-xs">{color}</span>
    </>
  );
}

/**
 * The picker starts collapsed: on a phone, a tap that stops a scroll over the
 * swatches or the plane would otherwise pick a colour.
 */
export function ColorField() {
  const color = useFilters((f) => f.color);

  return (
    <Collapsible>
      <CollapsibleTrigger className="group/color focus-visible:ring-ring flex h-8 w-full touch-manipulation items-center justify-between gap-3 rounded-md text-base font-medium outline-none focus-visible:ring-2 sm:text-sm">
        <span>{m.filter_color()}</span>
        <span className="text-muted-foreground flex items-center gap-1.5 font-normal">
          <ColorValue color={color} />
          <CaretDownIcon
            aria-hidden="true"
            className="size-3.5 opacity-50 transition-transform group-data-panel-open/color:rotate-180 motion-reduce:transition-none"
          />
        </span>
      </CollapsibleTrigger>
      {/* the bleed keeps focus rings and the hue thumb clear of the panel's clip */}
      <CollapsiblePanel className="-mx-2 motion-reduce:transition-none">
        <div className="px-2 pt-2 pb-1">
          <ColorControls />
        </div>
      </CollapsiblePanel>
    </Collapsible>
  );
}

export function ColorPopover({ className }: { className?: string }) {
  const color = useFilters((f) => f.color);

  return (
    <Popover>
      <PopoverTrigger
        aria-label={m.filter_color()}
        data-active={color !== undefined || undefined}
        className={cn(toolbarTrigger, className)}
      >
        <span className="flex items-center gap-1.5">
          {m.filter_color()}
          {color !== undefined && <ColorValue color={color} />}
        </span>
        <CaretDownIcon className="size-3.5 opacity-50" />
      </PopoverTrigger>
      <PopoverPopup align="start" className="w-60">
        <ColorControls />
      </PopoverPopup>
    </Popover>
  );
}
