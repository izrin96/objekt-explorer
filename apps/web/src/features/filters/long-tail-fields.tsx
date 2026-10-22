import {
  ArrowsClockwiseIcon,
  CaretDownIcon,
  LockSimpleIcon,
  LockSimpleOpenIcon,
  XIcon,
} from "@phosphor-icons/react";
import { validEdition, validOnlineTypes } from "@repo/cosmo/types/common";
import type { ValidEdition, ValidOnlineType } from "@repo/cosmo/types/common";
import { useId, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { Radio, RadioGroup } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { ColorPicker } from "./color-picker";
import { COLOR_SWATCHES } from "./facets";
import { FilterCollection } from "./filter-collection";
import { FilterToggle } from "./filter-toggle";
import { EDITION_LABEL, ONLINE_TYPE_LABEL } from "./labels";
import type { LongTailField } from "./long-tail";
import { MultiSelect } from "./multi-select";
import { ALL_TYPES, OnlineFilter } from "./online-filter";
import {
  COLOR_SENSITIVITY_RANGE,
  DEFAULT_COLOR_SENSITIVITY,
  type FilterSearch,
} from "./search-schema";
import { SingleSelect } from "./single-select";
import { toolbarTrigger } from "./toolbar-trigger";
import { type FilterPatch, useFilters, useSetFilters } from "./use-filters";

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
function ColorControls() {
  const color = useFilters((f) => f.color);
  const colorSensitivity = useFilters((f) => f.colorSensitivity);
  const setFilters = useSetFilters();
  const sensitivityId = useId();
  const commitColor = useDebouncedCallback((hex: string) => setFilters({ color: hex }), 60);
  const sensitivity = colorSensitivity ?? DEFAULT_COLOR_SENSITIVITY;

  return (
    <div className="flex flex-col gap-2">
      <ColorPicker
        value={color ?? undefined}
        defaultValue={COLOR_SWATCHES[0]}
        swatches={COLOR_SWATCHES}
        onValueChange={commitColor}
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
function ColorField() {
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

function CollectionField({ options }: { options: readonly string[] }) {
  const collection = useFilters((f) => f.collection);
  const setFilters = useSetFilters();

  return (
    <FilterCollection
      label={m.filter_collection_no()}
      options={options}
      value={collection ?? []}
      onChange={(value) => setFilters({ collection: value.length > 0 ? value : undefined })}
      className="w-full justify-between"
    />
  );
}

/**
 * The on/off long-tail filters, drawn as switches in the sheet and as
 * `FilterToggle`s on the toolbar; one list so the two read and write them alike.
 */
const SWITCHES: readonly {
  field: LongTailField;
  label: () => string;
  checked: (filters: FilterSearch) => boolean;
  patch: (on: boolean) => FilterPatch;
}[] = [
  {
    field: "hidePin",
    label: m.filter_disable_pin,
    checked: (f) => f.hidePin === true,
    patch: (on) => ({ hidePin: on || undefined }),
  },
  {
    field: "missing",
    label: m.filter_show_missing,
    // `unowned` is the older spelling of the same view; one control owns both
    checked: (f) => f.missing === true || f.unowned === true,
    patch: (on) => ({ missing: on || undefined, unowned: undefined }),
  },
  {
    field: "priced",
    label: m.filter_priced_only,
    checked: (f) => f.priced === true,
    patch: (on) => ({ priced: on || undefined }),
  },
];

/** The long tail as the mobile Filters sheet stacks it. */
export function LongTailFields({
  fields,
  collectionNos = [],
}: {
  fields: readonly LongTailField[];
  collectionNos?: readonly string[];
}) {
  const filters = useFilters();
  const setFilters = useSetFilters();
  const has = (field: LongTailField) => fields.includes(field);
  const switches = has("locked") || SWITCHES.some((def) => has(def.field));

  return (
    <div className="flex flex-col gap-1">
      {has("collection") && (
        <>
          <CollectionField options={collectionNos} />
          <div className="my-1 border-t" />
        </>
      )}
      {has("locked") && <LockCycle />}
      {SWITCHES.filter((def) => has(def.field)).map((def) => (
        <SwitchRow
          key={def.field}
          label={def.label()}
          checked={def.checked(filters)}
          onChange={(value) => setFilters(def.patch(value))}
        />
      ))}

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
          <ColorField />
        </>
      )}
    </div>
  );
}

function ColorPopover({ className }: { className?: string }) {
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

const LOCK_OPTION = { all: undefined, locked: true, unlocked: false } as const;
type LockOption = keyof typeof LOCK_OPTION;

const EDITION_OPTIONS = validEdition.map(String);

/**
 * The same long tail as `LongTailFields`, one toolbar control per field, for
 * the `md+` row; below `md` the Filters sheet holds them.
 */
export function LongTailToolbar({
  fields,
  collectionNos = [],
  className,
}: {
  fields: readonly LongTailField[];
  collectionNos?: readonly string[];
  className?: string;
}) {
  const filters = useFilters();
  const setFilters = useSetFilters();
  const has = (field: LongTailField) => fields.includes(field);
  const lock: LockOption =
    filters.locked === undefined ? "all" : filters.locked ? "locked" : "unlocked";

  return (
    <>
      {has("collection") && (
        <FilterCollection
          label={m.filter_collection_no()}
          options={collectionNos}
          value={filters.collection ?? []}
          onChange={(value) => setFilters({ collection: value.length > 0 ? value : undefined })}
          className={className}
        />
      )}
      <OnlineFilter className={className} />
      {has("edition") && (
        <MultiSelect
          label={m.filter_edition()}
          // the select keys its items by string; editions are numbers in the URL
          options={EDITION_OPTIONS}
          getOptionLabel={(value) => EDITION_LABEL[Number(value) as ValidEdition]}
          value={(filters.edition ?? []).map(String)}
          onChange={(value) =>
            setFilters({
              edition: value.length > 0 ? value.map((v) => Number(v) as ValidEdition) : undefined,
            })
          }
          className={className}
        />
      )}
      {has("color") && <ColorPopover className={className} />}
      {has("locked") && (
        <SingleSelect<LockOption>
          label={m.filter_lock_state()}
          options={[
            { value: "all", label: m.filter_all() },
            { value: "locked", label: m.filter_only_locked() },
            { value: "unlocked", label: m.filter_only_unlocked() },
          ]}
          value={lock}
          defaultValue="all"
          onChange={(value) => setFilters({ locked: LOCK_OPTION[value] })}
          className={className}
        />
      )}
      {SWITCHES.filter((def) => has(def.field)).map((def) => (
        <FilterToggle
          key={def.field}
          label={def.label()}
          pressed={def.checked(filters)}
          onPressedChange={(value) => setFilters(def.patch(value))}
          className={className}
        />
      ))}
    </>
  );
}
