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
import { Radio, RadioGroup } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { COLOR_SWATCHES } from "./facets";
import { EDITION_LABEL, ONLINE_TYPE_LABEL } from "./labels";
import {
  COLOR_SENSITIVITY_RANGE,
  DEFAULT_COLOR_SENSITIVITY,
  type FilterSearch,
} from "./search-schema";
import { useFilters, useSetFilters } from "./use-filters";

/**
 * The long-tail filters one surface offers. Type is on every surface, so it is
 * not a member; everything else is named per surface by `LONG_TAIL` below.
 */
export type LongTailField =
  | "transferable"
  | "grouped"
  | "hidePin"
  | "locked"
  | "missing"
  | "priced"
  | "edition"
  | "color";

/**
 * `apps/website`'s filter matrix, one column per surface: a field absent here
 * is absent from that surface's popover, its sheet and its "Filters · n" count.
 */
export const LONG_TAIL = {
  home: ["edition", "color"],
  market: ["priced", "edition", "color"],
  list: ["grouped", "edition", "color"],
  collection: ["hidePin", "locked", "missing", "edition", "color"],
  trades: [],
  progress: ["transferable", "edition"],
  stats: ["edition"],
} as const satisfies Record<string, readonly LongTailField[]>;

/** Count shown on the "Filters" button: long-tail filters only. */
export function longTailCount(filters: FilterSearch, fields: readonly LongTailField[]): number {
  const set = (field: LongTailField, on: boolean) => Number(fields.includes(field) && on);
  return (
    set("transferable", filters.transferable === true) +
    set("grouped", filters.grouped === true) +
    set("hidePin", filters.hidePin === true) +
    set("locked", filters.locked !== undefined) +
    set("missing", filters.missing === true || filters.unowned === true) +
    set("priced", filters.priced === true) +
    set("edition", (filters.edition?.length ?? 0) > 0) +
    set("color", filters.color !== undefined) +
    Number((filters.on_offline?.length ?? 0) > 0)
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Label className="flex h-8 items-center justify-between gap-3 font-medium">
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
    <div className="flex h-8 items-center justify-between gap-3 text-base font-medium sm:text-sm">
      <span>{label}</span>
      {children}
    </div>
  );
}

function GroupHeading({ id, children }: { id: string; children: ReactNode }) {
  return (
    <span id={id} className="text-muted-foreground text-xs font-medium">
      {children}
    </span>
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
            <Label id={sensitivityId} render={<span />} className="font-medium">
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
    <ControlRow label={m.filter_lock_state()}>
      <Button
        variant="outline"
        size="sm"
        aria-label={`${m.filter_lock_state()}: ${label}`}
        className="w-fit justify-between font-normal"
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

/** the absence of `on_offline`, spelled as a value so the radio group has an "All" */
const ALL_TYPES = "all";

function TypeField() {
  const onOffline = useFilters((f) => f.on_offline);
  const setFilters = useSetFilters();
  const headingId = useId();

  return (
    <>
      <GroupHeading id={headingId}>{m.filter_type()}</GroupHeading>
      <RadioGroup
        aria-labelledby={headingId}
        className="gap-1"
        value={onOffline?.[0] ?? ALL_TYPES}
        onValueChange={(value) =>
          setFilters({
            on_offline: value === ALL_TYPES ? undefined : [value as ValidOnlineType],
          })
        }
      >
        <Row label={m.filter_all()}>
          <Radio value={ALL_TYPES} />
        </Row>
        {validOnlineTypes.map((type) => (
          <Row key={type} label={ONLINE_TYPE_LABEL[type]()}>
            <Radio value={type} />
          </Row>
        ))}
      </RadioGroup>
    </>
  );
}

function EditionField() {
  const edition = useFilters((f) => f.edition);
  const setFilters = useSetFilters();
  const headingId = useId();
  const selected = edition ?? [];

  const toggle = (value: ValidEdition, on: boolean) =>
    setFilters({
      edition: on ? [...selected, value] : selected.filter((item) => item !== value),
    });

  return (
    <>
      <GroupHeading id={headingId}>{m.filter_edition()}</GroupHeading>
      <div role="group" aria-labelledby={headingId} className="flex flex-col gap-1">
        {validEdition.map((value) => (
          <Row key={value} label={EDITION_LABEL[value]}>
            <Checkbox
              checked={selected.includes(value)}
              onCheckedChange={(checked) => toggle(value, checked === true)}
            />
          </Row>
        ))}
      </div>
    </>
  );
}

function SwitchRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <Row label={label}>
      <Switch size="sm" checked={checked} onCheckedChange={onChange} />
    </Row>
  );
}

/** One set of controls for the desktop popover and the mobile sheet both. */
export function LongTailFields({ fields }: { fields: readonly LongTailField[] }) {
  const filters = useFilters();
  const setFilters = useSetFilters();
  const has = (field: LongTailField) => fields.includes(field);
  const switches =
    has("transferable") ||
    has("grouped") ||
    has("hidePin") ||
    has("locked") ||
    has("missing") ||
    has("priced");

  return (
    <div className="flex flex-col gap-1">
      {has("transferable") && (
        <SwitchRow
          label={m.filter_transferable()}
          checked={filters.transferable === true}
          onChange={(value) => setFilters({ transferable: value || undefined })}
        />
      )}
      {has("grouped") && (
        <SwitchRow
          label={m.filter_combine_dups()}
          checked={filters.grouped === true}
          onChange={(value) => setFilters({ grouped: value || undefined })}
        />
      )}
      {has("hidePin") && (
        <SwitchRow
          label={m.filter_disable_pin()}
          checked={filters.hidePin === true}
          onChange={(value) => setFilters({ hidePin: value || undefined })}
        />
      )}
      {has("locked") && <LockCycle />}
      {has("missing") && (
        <SwitchRow
          label={m.filter_show_missing()}
          checked={filters.missing === true || filters.unowned === true}
          // `unowned` is the older spelling of the same view; one control owns both
          onChange={(value) => setFilters({ missing: value || undefined, unowned: undefined })}
        />
      )}
      {has("priced") && (
        <SwitchRow
          label={m.filter_priced_only()}
          checked={filters.priced === true}
          onChange={(value) => setFilters({ priced: value || undefined })}
        />
      )}

      {switches && <div className="my-1 border-t" />}

      <TypeField />

      {has("edition") && (
        <>
          <div className="my-1 border-t" />
          <EditionField />
        </>
      )}

      {has("color") && (
        <>
          <div className="my-1 border-t" />
          <span className="text-muted-foreground mb-0.5 text-xs font-medium">
            {m.filter_color()}
          </span>
          <ColorField />
        </>
      )}
    </div>
  );
}

/** Long-tail filters behind a "Filters · n" button. */
export function FilterPopover({
  fields,
  className,
}: {
  fields: readonly LongTailField[];
  className?: string;
}) {
  const count = useFilters((filters) => longTailCount(filters, fields));

  return (
    <Popover>
      <PopoverTrigger
        render={<Button variant="outline" size="sm" className={cn("gap-1.5", className)} />}
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
        <LongTailFields fields={fields} />
      </PopoverPopup>
    </Popover>
  );
}
