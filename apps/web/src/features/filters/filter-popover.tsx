import {
  ArrowsClockwiseIcon,
  FunnelSimpleIcon,
  LockSimpleIcon,
  LockSimpleOpenIcon,
  XIcon,
} from "@phosphor-icons/react";
import { validEdition, validOnlineTypes } from "@repo/cosmo/types/common";
import type { ValidEdition, ValidOnlineType } from "@repo/cosmo/types/common";
import { useId, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ColorPicker } from "@/components/ui/color-picker";
import { Label } from "@/components/ui/label";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { COLOR_SWATCHES } from "./facets";
import {
  COLOR_SENSITIVITY_RANGE,
  DEFAULT_COLOR_SENSITIVITY,
  type FilterSearch,
} from "./search-schema";
import { useFilters, useSetFilters } from "./use-filters";

/** the website's `getEditionStr`; the ordinals are product terms, not prose */
export const EDITION_LABEL: Record<ValidEdition, string> = { 1: "1st", 2: "2nd", 3: "3rd" };

export const ONLINE_TYPE_LABEL: Record<ValidOnlineType, () => string> = {
  online: m.filter_digital,
  offline: m.filter_physical,
};

/** Count shown on the "Filters" button: long-tail filters only. */
export function longTailCount(filters: FilterSearch): number {
  return (
    Number(filters.transferable === true) +
    Number(filters.grouped === true) +
    Number(filters.hidePin === true) +
    Number(filters.locked !== undefined) +
    Number(filters.priced === true) +
    Number((filters.on_offline?.length ?? 0) > 0) +
    Number((filters.edition?.length ?? 0) > 0) +
    Number(filters.color !== undefined)
  );
}

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
 * button nested in one receives the label's forwarded click on top of its own
 * and fires twice.
 */
function ControlRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex h-8 items-center justify-between gap-3 text-[13px] font-medium">
      <span>{label}</span>
      {children}
    </div>
  );
}

/**
 * `onValueChange` fires on every pointer move across the saturation plane, so
 * it reaches the URL through a debounce; each commit re-filters the catalogue.
 */
function ColorField() {
  const color = useFilters((f) => f.color);
  const colorSensitivity = useFilters((f) => f.colorSensitivity);
  const setFilters = useSetFilters();
  const sensitivityId = useId();
  const commitColor = useDebouncedCallback((hex: string) => setFilters({ color: hex }), 60);
  const sensitivity = colorSensitivity ?? DEFAULT_COLOR_SENSITIVITY;

  return (
    <div className="flex flex-col gap-2">
      <ColorPicker
        label={m.filter_color()}
        value={color ?? undefined}
        defaultValue={COLOR_SWATCHES[0]}
        swatches={[...COLOR_SWATCHES]}
        onValueChange={commitColor}
        className="w-full"
      />
      {color !== undefined && (
        <>
          <div className="flex h-6 items-center justify-between gap-3">
            <Label id={sensitivityId} render={<span />} className="text-[13px] font-medium">
              {m.filter_color_sensitivity()}
            </Label>
            <span className="text-muted-foreground font-mono text-xs tabular-nums">
              {sensitivity}
            </span>
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
            className="text-[13px]"
            onClick={() => setFilters({ color: undefined, colorSensitivity: undefined })}
          >
            <XIcon />
            {m.filter_clear_color()}
          </Button>
        </>
      )}
    </div>
  );
}

/** the three states the `locked` parameter has, in the order the control walks */
const LOCK_CYCLE = [undefined, true, false] as const;

/**
 * Tri-state on one control: absent is every objekt, `true` only locked, `false`
 * only unlocked. Activating steps to the next state and the button's text is
 * the state it is in, so there is no hidden mode.
 */
function LockCycle() {
  const locked = useFilters((f) => f.locked);
  const setFilters = useSetFilters();

  const label =
    locked === undefined
      ? m.filter_all()
      : locked
        ? m.filter_only_locked()
        : m.filter_only_unlocked();

  return (
    <ControlRow label={m.filter_lock_unlocked()}>
      <Button
        variant="outline"
        size="sm"
        aria-label={`${m.filter_lock_unlocked()}: ${label}`}
        className="w-32 justify-between text-[13px] font-normal"
        onClick={() =>
          setFilters({ locked: LOCK_CYCLE[(LOCK_CYCLE.indexOf(locked) + 1) % LOCK_CYCLE.length] })
        }
      >
        <span className="flex items-center gap-1.5">
          {locked === undefined ? (
            <ArrowsClockwiseIcon />
          ) : locked ? (
            <LockSimpleIcon weight="fill" />
          ) : (
            <LockSimpleOpenIcon />
          )}
          {label}
        </span>
      </Button>
    </ControlRow>
  );
}

/** One set of controls for the desktop popover and the mobile sheet both. */
export function LongTailFields({
  showPricedOnly = false,
  showLock = false,
}: {
  showPricedOnly?: boolean;
  /** only a surface with owned tokens has a lock for the filter to read */
  showLock?: boolean;
}) {
  const filters = useFilters();
  const setFilters = useSetFilters();

  const onOffline = filters.on_offline ?? [];
  const edition = filters.edition ?? [];

  const toggleType = (type: ValidOnlineType, on: boolean) =>
    setFilters({
      on_offline: on ? [...onOffline, type] : onOffline.filter((value) => value !== type),
    });

  const toggleEdition = (value: ValidEdition, on: boolean) =>
    setFilters({
      edition: on ? [...edition, value] : edition.filter((item) => item !== value),
    });

  return (
    <div className="flex flex-col gap-1">
      <Row label={m.filter_transferable()}>
        <Switch
          size="sm"
          checked={filters.transferable === true}
          onCheckedChange={(value) => setFilters({ transferable: value || undefined })}
        />
      </Row>
      <Row label={m.filter_combine_dups()}>
        <Switch
          size="sm"
          checked={filters.grouped === true}
          onCheckedChange={(value) => setFilters({ grouped: value || undefined })}
        />
      </Row>
      <Row label={m.filter_disable_pin()}>
        <Switch
          size="sm"
          checked={filters.hidePin === true}
          onCheckedChange={(value) => setFilters({ hidePin: value || undefined })}
        />
      </Row>
      {showLock && <LockCycle />}
      {showPricedOnly && (
        <Row label={m.filter_priced_only()}>
          <Switch
            size="sm"
            checked={filters.priced === true}
            onCheckedChange={(value) => setFilters({ priced: value || undefined })}
          />
        </Row>
      )}

      <div className="my-1 border-t" />

      <span className="text-muted-foreground text-xs font-medium">{m.filter_type()}</span>
      {validOnlineTypes.map((type) => (
        <Row key={type} label={ONLINE_TYPE_LABEL[type]()}>
          <Checkbox
            checked={onOffline.includes(type)}
            onCheckedChange={(value) => toggleType(type, value === true)}
          />
        </Row>
      ))}

      <div className="my-1 border-t" />

      <span className="text-muted-foreground text-xs font-medium">{m.filter_edition()}</span>
      {validEdition.map((value) => (
        <Row key={value} label={EDITION_LABEL[value]}>
          <Checkbox
            checked={edition.includes(value)}
            onCheckedChange={(checked) => toggleEdition(value, checked === true)}
          />
        </Row>
      ))}

      <div className="my-1 border-t" />

      <span className="text-muted-foreground mb-0.5 text-xs font-medium">{m.filter_color()}</span>
      <ColorField />
    </div>
  );
}

/** Long-tail filters behind a "Filters · n" button. */
export function FilterPopover({
  showPricedOnly = false,
  showLock = false,
  className,
}: {
  showPricedOnly?: boolean;
  showLock?: boolean;
  className?: string;
}) {
  const count = useFilters(longTailCount);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm" className={cn("gap-1.5 text-[13px]", className)} />
        }
      >
        <FunnelSimpleIcon />
        {m.filter_filters()}
        {count > 0 && (
          <Badge size="sm" className="bg-accent text-accent-foreground font-mono">
            {count}
          </Badge>
        )}
      </PopoverTrigger>
      <PopoverPopup align="start" className="w-60">
        <LongTailFields showPricedOnly={showPricedOnly} showLock={showLock} />
      </PopoverPopup>
    </Popover>
  );
}
