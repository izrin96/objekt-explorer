import { ArrowsClockwiseIcon, LockSimpleIcon, LockSimpleOpenIcon } from "@phosphor-icons/react";
import { validEdition } from "@repo/cosmo/types/common";
import type { ValidEdition } from "@repo/cosmo/types/common";
import { Fragment, useId, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { m } from "@/paraglide/messages";

import { FilterToggle } from "./filter-toggle";
import { EDITION_LABEL } from "./labels";
import type { LongTailField } from "./long-tail";
import { ColorField, ColorPopover } from "./long-tail-color";
import { MultiSelect } from "./multi-select";
import type { FilterSearch } from "./search-schema";
import { SingleSelect } from "./single-select";
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
export function LongTailFields({ fields }: { fields: readonly LongTailField[] }) {
  const filters = useFilters();
  const setFilters = useSetFilters();
  const has = (field: LongTailField) => fields.includes(field);
  const switches = has("locked") || SWITCHES.some((def) => has(def.field));
  const sections = [
    switches && (
      <Fragment key="switches">
        {has("locked") && <LockCycle />}
        {SWITCHES.filter((def) => has(def.field)).map((def) => (
          <SwitchRow
            key={def.field}
            label={def.label()}
            checked={def.checked(filters)}
            onChange={(value) => setFilters(def.patch(value))}
          />
        ))}
      </Fragment>
    ),
    has("edition") && <EditionField key="edition" />,
    has("color") && <ColorField key="color" />,
  ].filter(Boolean);

  if (sections.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      {sections.map((section, index) => (
        <Fragment key={index}>
          {index > 0 && <div className="my-1 border-t" />}
          {section}
        </Fragment>
      ))}
    </div>
  );
}

const LOCK_OPTION = { all: undefined, locked: true, unlocked: false } as const;
type LockOption = keyof typeof LOCK_OPTION;

const EDITION_OPTIONS = validEdition.map(String);
const editionOf = (value: string) => validEdition.find((edition) => String(edition) === value);

/**
 * The same long tail as `LongTailFields`, one toolbar control per field, for
 * the `md+` row; below `md` the Filters sheet holds them.
 */
export function LongTailToolbar({
  fields,
  className,
}: {
  fields: readonly LongTailField[];
  className?: string;
}) {
  const filters = useFilters();
  const setFilters = useSetFilters();
  const has = (field: LongTailField) => fields.includes(field);
  const lock: LockOption =
    filters.locked === undefined ? "all" : filters.locked ? "locked" : "unlocked";

  return (
    <>
      {has("edition") && (
        <MultiSelect
          label={m.filter_edition()}
          // the select keys its items by string; editions are numbers in the URL
          options={EDITION_OPTIONS}
          getOptionLabel={(value) => {
            const edition = editionOf(value);
            return edition === undefined ? value : EDITION_LABEL[edition];
          }}
          value={(filters.edition ?? []).map(String)}
          onChange={(value) => {
            const edition = value.map(editionOf).filter((e) => e !== undefined);
            setFilters({ edition: edition.length > 0 ? edition : undefined });
          }}
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
