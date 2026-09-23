import { FunnelSimpleIcon, XIcon } from "@phosphor-icons/react";
import { useId, type ReactNode } from "react";

import { COLOR_SWATCHES } from "@/components/filters/facets";
import {
  COLOR_SENSITIVITY_RANGE,
  DEFAULT_COLOR_SENSITIVITY,
  EDITIONS,
  longTailCount,
  useFilters,
  type Edition,
  type OnOffline,
} from "@/components/filters/filter-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ColorPicker } from "@/components/ui/color-picker";
import { Label } from "@/components/ui/label";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { cn } from "@/lib/utils";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Label className="flex h-8 items-center justify-between gap-3 text-[13px] font-medium">
      {label}
      {children}
    </Label>
  );
}

/**
 * `Row`'s sibling for a control that must not be wrapped in a `<label>`: a
 * Select trigger nested in one receives the label's forwarded click on top of
 * its own and opens and closes its popup in the same gesture.
 */
function ControlRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex h-8 items-center justify-between gap-3 text-[13px] font-medium">
      <span>{label}</span>
      {children}
    </div>
  );
}

const TYPES: { value: OnOffline; label: string }[] = [
  { value: "online", label: "Digital" },
  { value: "offline", label: "Physical" },
];

/**
 * The website's three colour controls (`filter-color.tsx`,
 * `filter-color-sensitivity.tsx`) in one column: the picker, and — once a
 * colour is set — the Delta-E slider and a clear button. The picker's own
 * trigger is the swatch-and-hex button, so there is no separate label row.
 *
 * `onValueChange` fires on every pointer move across the saturation plane, so
 * it reaches the store through the same 60 ms debounce the website uses;
 * `applyFilters` runs over the whole catalogue on each commit.
 */
function ColorField() {
  const f = useFilters();
  const sensitivityId = useId();
  const commitColor = useDebouncedCallback((hex: string) => f.set({ color: hex }), 60);
  const sensitivity = f.colorSensitivity ?? DEFAULT_COLOR_SENSITIVITY;
  // `null` is the stored form of the default, the way the website writes the
  // sensitivity back to the URL
  const setSensitivity = (n: number) =>
    f.set({ colorSensitivity: n === DEFAULT_COLOR_SENSITIVITY ? null : n });

  return (
    <div className="flex flex-col gap-2">
      <ColorPicker
        label="Objekt colour"
        value={f.color ?? undefined}
        defaultValue={COLOR_SWATCHES[0]}
        swatches={[...COLOR_SWATCHES]}
        onValueChange={commitColor}
        className="w-full"
      />
      {f.color !== null && (
        <>
          <div className="flex h-6 items-center justify-between gap-3">
            <Label id={sensitivityId} render={<span />} className="text-[13px] font-medium">
              Sensitivity
            </Label>
            <span className="text-muted-foreground font-mono text-xs tabular-nums">
              {sensitivity}
            </span>
          </div>
          <Slider
            aria-labelledby={sensitivityId}
            /* names the hidden range input the Base UI thumb renders; without
               it devtools reports a form field with no id or name */
            name="colorSensitivity"
            className="px-0.5 pb-1"
            min={COLOR_SENSITIVITY_RANGE.min}
            max={COLOR_SENSITIVITY_RANGE.max}
            step={1}
            value={sensitivity}
            /* one thumb, so the callback's `number | readonly number[]` is
               always the number half */
            onValueChange={(v) => setSensitivity(typeof v === "number" ? v : (v[0] ?? sensitivity))}
          />
          <Button
            variant="outline"
            size="sm"
            className="text-[13px]"
            onClick={() => f.set({ color: null, colorSensitivity: null })}
          >
            <XIcon />
            Clear colour
          </Button>
        </>
      )}
    </div>
  );
}

/**
 * The long-tail fields on their own, so the desktop popover and the mobile
 * Filters sheet render one set of controls instead of keeping two copies.
 */
export function LongTailFields({
  showPricedOnly = false,
  showLock = false,
}: {
  showPricedOnly?: boolean;
  /** only the profile Collection toolbar owns a lock set for the filter to read */
  showLock?: boolean;
}) {
  const f = useFilters();

  const toggleType = (t: OnOffline, on: boolean) =>
    f.set({ onOffline: on ? [...f.onOffline, t] : f.onOffline.filter((x) => x !== t) });

  return (
    <div className="flex flex-col gap-1">
      <Row label="Transferable">
        <Switch
          size="sm"
          checked={f.transferable}
          onCheckedChange={(v) => f.set({ transferable: v })}
        />
      </Row>
      <Row label="Combine duplicates">
        <Switch size="sm" checked={f.combine} onCheckedChange={(v) => f.set({ combine: v })} />
      </Row>
      <Row label="Hide pins">
        <Switch size="sm" checked={f.hidePins} onCheckedChange={(v) => f.set({ hidePins: v })} />
      </Row>
      {showLock && (
        <ControlRow label="Lock">
          {/* three-way, like the website's `locked` search param: `null` is
              "any", and the two picks are the boolean the filter compares */}
          <Select value={f.locked} onValueChange={(v: boolean | null) => f.set({ locked: v })}>
            <SelectTrigger size="sm" aria-label="Lock" className="w-32">
              {/* a boolean renders as nothing on its own, so the trigger reads
                  the value through a render child rather than a placeholder */}
              <SelectValue>
                {(value: boolean | null) =>
                  value === null ? "Any" : value ? "Locked" : "Unlocked"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectPopup>
              <SelectItem value={null}>Any</SelectItem>
              <SelectItem value={true}>Locked</SelectItem>
              <SelectItem value={false}>Unlocked</SelectItem>
            </SelectPopup>
          </Select>
        </ControlRow>
      )}
      {showPricedOnly && (
        <Row label="Priced only">
          <Switch
            size="sm"
            checked={f.pricedOnly}
            onCheckedChange={(v) => f.set({ pricedOnly: v })}
          />
        </Row>
      )}

      <div className="my-1 border-t" />

      <span className="text-muted-foreground text-xs font-medium">Type</span>
      {TYPES.map((t) => (
        <Row key={t.value} label={t.label}>
          <Checkbox
            checked={f.onOffline.includes(t.value)}
            onCheckedChange={(v) => toggleType(t.value, v === true)}
          />
        </Row>
      ))}

      <div className="my-1 border-t" />

      <span className="text-muted-foreground text-xs font-medium">Edition</span>
      <Select value={f.edition} onValueChange={(v: Edition | null) => f.set({ edition: v })}>
        <SelectTrigger size="sm" aria-label="Edition">
          <SelectValue placeholder="Any edition" />
        </SelectTrigger>
        <SelectPopup>
          <SelectItem value={null}>Any edition</SelectItem>
          {EDITIONS.map((e) => (
            <SelectItem key={e} value={e}>
              {e}
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>

      <div className="my-1 border-t" />

      <span className="text-muted-foreground mb-0.5 text-xs font-medium">Colour</span>
      <ColorField />
    </div>
  );
}

/** Long-tail filters behind a "Filters · n" button, per the mockup. */
export function FilterPopover({
  showPricedOnly = false,
  showLock = false,
  className,
}: {
  showPricedOnly?: boolean;
  showLock?: boolean;
  className?: string;
}) {
  const n = longTailCount(useFilters());

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm" className={cn("gap-1.5 text-[13px]", className)} />
        }
      >
        <FunnelSimpleIcon />
        Filters
        {n > 0 && (
          <Badge size="sm" className="bg-accent text-accent-foreground font-mono">
            {n}
          </Badge>
        )}
      </PopoverTrigger>
      <PopoverPopup align="start" className="w-60">
        <LongTailFields showPricedOnly={showPricedOnly} showLock={showLock} />
      </PopoverPopup>
    </Popover>
  );
}
