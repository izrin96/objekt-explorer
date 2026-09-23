import { PulseIcon } from "@phosphor-icons/react";
import { createRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { ActiveChips } from "@/components/filters/active-chips";
import {
  EMPTY_FACET_VALUES,
  FACET_KEYS,
  FacetControls,
  useDeclaredFacets,
  useFacetParity,
  type FacetKey,
  type FacetValues,
} from "@/components/filters/facet-controls";
import { useScopedFacets } from "@/components/filters/facets";
import { FilterSheet } from "@/components/filters/filter-sheet";
import { MultiSelect } from "@/components/filters/multi-select";
import { ObjektDrawer } from "@/components/objekt-drawer";
import { DataTable, DataTableHead, DataTableRow } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { TimeAgo } from "@/components/shared/time-ago";
import { Button } from "@/components/ui/button";
import { type LabObjekt, objekts, ownedObjekt } from "@/fixtures/objekts";
import { collectionShortNo, EVENT_COLOR, type EventKind } from "@/lib/objekt";
import { hash, rng } from "@/lib/seeded";
import { rootRoute } from "@/routes/root";

const EVENTS = ["Mint", "Transfer", "Spin"] as const;
/** the Title-Case label; `EventKind` is the same three values as the dot map keys */
type Event = (typeof EVENTS)[number];

/** the feed labels its rows in Title Case; the shared dot map is keyed on the kind */
const EVENT_KIND: Record<Event, EventKind> = {
  Mint: "mint",
  Transfer: "transfer",
  Spin: "spin",
};

const USERS = [
  "VienVoiSam",
  "1jetVN274",
  "ㅂㅂㅈ38",
  "빵시온6",
  "HongSseulGwigon",
  "sakura6",
  "IGWT",
];

type Row = {
  id: string;
  objekt: LabObjekt;
  /** every on-chain event is one token, so a row names a serial, not a collection */
  serial: number;
  transferable: boolean;
  event: Event;
  from: string;
  to: string;
  /** when the event landed; the feed is newest first */
  at: Date;
};

/**
 * The lab has no live minted range per collection at module scope, and the
 * ranges it does see vary by an order of magnitude (178 on a fresh Summer26
 * row, 1285 on atom01). Seeding inside the smallest of them keeps almost every
 * row on a serial the live API can actually answer for, so opening one lands
 * on a real timeline rather than on "Serial not found".
 */
const MAX_SEEDED_SERIAL = 150;

/**
 * Rows are placed on a widening ladder back from load — seconds at the top,
 * days by the bottom — so the page shows both halves of `relativeTime` at
 * once, including rows past the 30-day boundary where it switches to a plain
 * date. A pre-rendered string (`"3s ago"`) would leave the row's tooltip with
 * nothing true to resolve to.
 */
const FEED_START = Date.now();

const ROWS: Row[] = objekts.map((o, i) => {
  const event: Event = EVENTS[i % 3] ?? "Mint";
  const a = USERS[i % USERS.length] ?? "";
  const b = USERS[(i + 3) % USERS.length] ?? "";
  const id = `${o.id}-${i}`;
  const next = rng(hash(id));
  return {
    id,
    objekt: o,
    serial: 1 + Math.floor(next() * MAX_SEEDED_SERIAL),
    transferable: next() > 0.22,
    event,
    from: event === "Mint" ? "COSMO" : a,
    to: event === "Spin" ? "COSMO Spin" : b,
    // 3s, then widening: the tail of a 180-row feed lands months back
    at: new Date(FEED_START - (3 + i * 2) * 1000 * (1 + i * 0.9) ** 2),
  };
});

/**
 * The column tracks. The Objekt cell carries member + collection no. + serial,
 * which needs ~14rem before it starts eating the member name, so the row has a
 * floor it scrolls sideways under rather than reflowing — see `DataTable`.
 */
const COLUMNS = "grid-cols-[6rem_minmax(14rem,1.5fr)_1fr_1fr_7rem]";
const MIN_WIDTH = "min-w-160";

/**
 * Activity keeps its own filter state — deliberately not the Home/Market store —
 * but the same facet keys, so the shared `FACETS` table drives its toolbar too.
 */
type ActivityFilters = FacetValues & { event: string[] };

const EMPTY: ActivityFilters = { ...EMPTY_FACET_VALUES, event: [] };

type Chip = { key: string; label: string; remove: Partial<ActivityFilters> };

const CHIP_LABEL: Record<keyof ActivityFilters, string> = {
  event: "Event",
  artist: "Artist",
  member: "Member",
  season: "Season",
  class: "Class",
  collectionNo: "Collection",
};

function chipsOf(f: ActivityFilters): Chip[] {
  const chips: Chip[] = [];
  for (const key of ["event", ...FACET_KEYS] as (keyof ActivityFilters)[]) {
    for (const v of f[key]) {
      chips.push({
        key: `${key}:${v}`,
        label: `${CHIP_LABEL[key]}: ${v}`,
        remove: { [key]: f[key].filter((x) => x !== v) },
      });
    }
  }
  return chips;
}

/** the drawer opens in owned mode on the serial the row names */
function openedObjekt(row: Row): LabObjekt {
  return ownedObjekt(row.objekt, row.serial, row.transferable);
}

function Who({ name }: { name: string }) {
  const system = name.startsWith("COSMO") || name.startsWith("0x");
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className="bg-secondary size-4.5 shrink-0 rounded-full border" />
      <span className={system ? "text-muted-foreground font-mono text-xs" : "truncate"}>
        {name}
      </span>
    </span>
  );
}

function Activity() {
  const [f, setF] = useState<ActivityFilters>(EMPTY);
  const [active, setActive] = useState<LabObjekt | null>(null);
  const { facets, groups, scope } = useScopedFacets();

  const set = (patch: Partial<ActivityFilters>) => setF((prev) => ({ ...prev, ...patch }));
  const setFacet = (key: FacetKey, value: string[]) => set({ [key]: value });

  const inlineKeys = FACET_KEYS;
  useDeclaredFacets("inline", inlineKeys);
  useFacetParity();

  const rows = useMemo(
    () =>
      ROWS.filter((r) => {
        if (!scope.includes(r.objekt.artist)) return false;
        if (f.event.length && !f.event.includes(r.event)) return false;
        if (f.artist.length && !f.artist.includes(r.objekt.artist)) return false;
        if (f.member.length && !f.member.includes(r.objekt.member)) return false;
        if (f.season.length && !f.season.includes(r.objekt.season)) return false;
        if (f.class.length && !f.class.includes(r.objekt.class)) return false;
        if (f.collectionNo.length && !f.collectionNo.includes(r.objekt.collectionNo)) return false;
        return true;
      }),
    [f, scope],
  );

  const chips = chipsOf(f);

  return (
    <>
      <PageHeader
        title="Activity"
        description="Every mint, transfer and spin as it lands on-chain"
        aside={
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <i className="bg-success-foreground shadow-success-foreground/25 size-1.75 rounded-full shadow-[0_0_0_3px]" />
              Live · <span className="font-mono">142</span>/min
            </span>
            <Button variant="outline" size="sm">
              Pause
            </Button>
          </div>
        }
      />

      {/* filter bar — no search input on Activity, but every facet the other
          pages show, inline on md+ and stacked in the sheet below md */}
      <div className="flex flex-wrap items-center gap-2">
        <MultiSelect
          label="Event"
          options={EVENTS}
          value={f.event}
          onChange={(v) => set({ event: v })}
        />
        <FacetControls
          surface="inline"
          facets={facets}
          groups={groups}
          values={f}
          onChange={setFacet}
          keys={inlineKeys}
          controlClassName="max-md:hidden"
        />
        <FilterSheet
          facets={facets}
          groups={groups}
          values={f}
          onChange={setFacet}
          onReset={() => setF(EMPTY)}
        />
      </div>

      <ActiveChips chips={chips} onRemove={(c) => set(c.remove)} onReset={() => setF(EMPTY)} />

      <div className="text-muted-foreground font-mono text-[12.5px]">
        <b className="text-foreground font-semibold">{rows.length}</b> events
      </div>

      <DataTable columns={COLUMNS} minWidth={MIN_WIDTH}>
        <DataTableHead>
          <span>Event</span>
          <span>Objekt</span>
          <span>From</span>
          <span>To</span>
          <span className="text-right">When</span>
        </DataTableHead>
        {rows.map((r) => (
          <DataTableRow key={r.id} onActivate={() => setActive(openedObjekt(r))}>
            <span className="flex items-center gap-1.5 text-xs font-medium">
              <i
                className="size-1.5 rounded-full"
                style={{ background: EVENT_COLOR[EVENT_KIND[r.event]] }}
              />
              {r.event}
            </span>
            <span className="flex min-w-0 items-center gap-2.5">
              <img
                src={r.objekt.thumbnailImage}
                alt=""
                loading="lazy"
                decoding="async"
                className="bg-secondary h-7 w-4.5 shrink-0 rounded-[3px] object-cover"
              />
              <span className="truncate">
                {r.objekt.member}
                {/* collection no. and serial name the token this row is about,
                    so they read at the same contrast as the member */}
                <span className="ml-1.5 font-mono text-xs">
                  {collectionShortNo(r.objekt)} <b className="font-semibold">#{r.serial}</b>
                </span>
              </span>
            </span>
            <Who name={r.from} />
            <Who name={r.to} />
            <span className="text-muted-foreground text-right font-mono text-xs">
              <TimeAgo date={r.at} />
            </span>
          </DataTableRow>
        ))}
        {rows.length === 0 && (
          <EmptyState
            icon={PulseIcon}
            title="No events match"
            hint="No mint, transfer or spin in the feed fits the current filters."
            bordered={false}
            action={
              <Button variant="outline" size="sm" onClick={() => setF(EMPTY)}>
                Clear filters
              </Button>
            }
            className="border-t"
          />
        )}
      </DataTable>

      <ObjektDrawer objekt={active} onClose={() => setActive(null)} />
    </>
  );
}

export const activityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/activity",
  component: Activity,
});
