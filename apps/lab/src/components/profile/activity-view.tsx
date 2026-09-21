import { ArrowsLeftRightIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { endOfDay } from "date-fns";
import { useMemo, useState } from "react";

import type { ExtraFacet } from "@/components/filters/facet-controls";
import { useScopedFacets } from "@/components/filters/facets";
import {
  matchesFacets,
  TRANSFER_TYPE_LABEL,
  TRANSFER_TYPES,
  type TransferType,
  useFilters,
} from "@/components/filters/filter-store";
import { SingleSelect } from "@/components/filters/single-select";
import { ObjektDrawer } from "@/components/objekt-drawer";
import type { Profile } from "@/components/profile/profile-data";
import { ProfileToolbar, SnapshotPopover } from "@/components/profile/profile-toolbar";
import { DataTable, DataTableHead, DataTableRow } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { TimeAgo } from "@/components/shared/time-ago";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { LabObjekt } from "@/fixtures/objekts";
import { users } from "@/fixtures/users";
import { collectionShortNo } from "@/lib/objekt";
import { hash, rng } from "@/lib/seeded";
import { useSnapshotProfile } from "@/store/snapshot";

/**
 * The four kinds a transfer can be from this profile's point of view. They are
 * the website's `validType` minus `all`, and they are mutually exclusive there
 * too — `getTypeFilters` in `api/transfers.$address.ts` pairs each one with a
 * different `from` / `to` test — so one field can name a row's kind.
 */
type TransferKind = Exclude<TransferType, "all">;

type Row = {
  id: string;
  /** the owned token: it carries the serial the row is about */
  objekt: LabObjekt;
  kind: TransferKind;
  /** the other side, or `null` for the two Cosmo-side counterparties */
  counterparty: string | null;
  at: Date;
};

/** a mint or an incoming transfer; the website's `isReceiver` */
const isReceiver = (kind: TransferKind) => kind === "mint" || kind === "received";

/** `trades_cosmo` / `trades_cosmo_spin` — the two sides that are not a user */
const SYSTEM_LABEL: Record<"mint" | "spin", string> = {
  mint: "COSMO",
  spin: "COSMO Spin",
};

const NICKNAMES = users.map((u) => u.nickname);

/** how long a token is held before the profile passes it on, at most */
const HELD_WINDOW = 45 * 86_400_000;

/**
 * The profile's transfer history, seeded off the objekts it holds.
 *
 * Every owned token has to have arrived somehow, so each one produces an
 * acquisition row at its own `receivedAt` — a mint about a third of the time,
 * an incoming transfer otherwise. Roughly a third of them then produce a
 * second, later row: the profile sent that token on or spun it. Those rows are
 * about tokens the profile no longer holds, which is exactly what the website
 * shows too — the trades tab lists every transfer that touched the address,
 * not only the ones that ended in the current collection.
 *
 * Seeded per `nickname:objekt`, so a profile's feed is the same across reloads
 * the way the market and serial fixtures are.
 */
function seedTransfers(profile: Profile): Row[] {
  const now = Date.now();
  const rows: Row[] = [];

  for (const objekt of profile.objekts) {
    const next = rng(hash(`transfers:${profile.nickname}:${objekt.id}`));
    const pick = (): string => {
      const name = NICKNAMES[Math.floor(next() * NICKNAMES.length)] ?? NICKNAMES[0] ?? "";
      // the profile is never its own counterparty
      return name === profile.nickname ? (NICKNAMES[0] ?? "") : name;
    };

    const at = objekt.receivedAt ?? new Date(now);
    const minted = next() < 0.34;
    rows.push({
      id: `${objekt.id}-in`,
      objekt,
      kind: minted ? "mint" : "received",
      counterparty: minted ? null : pick(),
      at,
    });

    const moved = next();
    if (moved < 0.3) {
      const spun = moved < 0.08;
      rows.push({
        id: `${objekt.id}-out`,
        objekt,
        kind: spun ? "spin" : "sent",
        counterparty: spun ? null : pick(),
        // after arriving — an exit is never older than the entry that
        // preceded it — but within `HELD_WINDOW` of it rather than anywhere
        // up to now: spreading it over the whole remaining window puts almost
        // every outgoing row near today, and the top of the feed comes out
        // all Sent
        at: new Date(at.getTime() + next() * Math.min(now - at.getTime(), HELD_WINDOW)),
      });
    }
  }

  return rows.sort((a, b) => b.at.getTime() - a.at.getTime());
}

/**
 * The column tracks. The website's own row sizes its four cells `flex-1` over
 * a `min-w-[200px|270px|110px|250px]` floor — 830px of minimum, which cannot
 * survive `md` (768px), which is why it hides that layout below `md` and draws
 * a second, two-line one instead. The lab keeps one row shape at every width
 * and lets it scroll sideways under its floor, the way the global Activity
 * feed already did; `DataTable` owns both halves of that.
 */
const COLUMNS = "grid-cols-[7rem_minmax(14rem,1.5fr)_7rem_minmax(0,1fr)]";
const MIN_WIDTH = "min-w-160";

function Counterparty({ row }: { row: Row }) {
  if (row.counterparty === null) {
    return (
      <span className="text-muted-foreground font-mono">
        {SYSTEM_LABEL[row.kind === "mint" ? "mint" : "spin"]}
      </span>
    );
  }
  return (
    <Link
      to="/profile/$nickname"
      params={{ nickname: row.counterparty }}
      className="truncate underline-offset-2 hover:underline"
    >
      {row.counterparty}
    </Link>
  );
}

/** `Received` / `Sent`. The website paints these blue and rose with raw Tailwind
 * palette classes; the lab has no colour outside its own tokens, so they map
 * onto the `info` / `error` Badge variants, which are the same two readings
 * (neutral-incoming, warm-outgoing) in a pair that already flips with the theme. */
function ActionBadge({ kind }: { kind: TransferKind }) {
  const received = isReceiver(kind);
  return (
    <Badge variant={received ? "info" : "error"} size="sm">
      {received ? "Received" : "Sent"}
    </Badge>
  );
}

/** `member Z-code #serial`; the short no. reads at the member's contrast */
function ObjektName({ row }: { row: Row }) {
  return (
    <>
      {row.objekt.member}
      <span className="ml-1.5 font-mono text-xs">
        {collectionShortNo(row.objekt)} <b className="font-semibold">#{row.objekt.serial}</b>
      </span>
    </>
  );
}

function TradeRow({ row, onOpen }: { row: Row; onOpen: (objekt: LabObjekt) => void }) {
  return (
    /* no `onActivate`: the counterparty cell is a `<Link>`, so the row cannot
       be the button — the objekt cell carries the drawer trigger instead, the
       way the website's row does */
    <DataTableRow className="hover:bg-secondary/50">
      <span className="text-muted-foreground font-mono text-xs">
        <TimeAgo date={row.at} />
      </span>
      <button
        type="button"
        onClick={() => onOpen(row.objekt)}
        className="focus-visible:ring-ring min-w-0 cursor-pointer truncate text-left outline-none focus-visible:ring-2"
      >
        <ObjektName row={row} />
      </button>
      <span>
        <ActionBadge kind={row.kind} />
      </span>
      <span className="min-w-0 truncate">
        <Counterparty row={row} />
      </span>
    </DataTableRow>
  );
}

const TYPE_OPTIONS = TRANSFER_TYPES.map((value) => ({
  value,
  label: TRANSFER_TYPE_LABEL[value],
}));

/**
 * The Event control, defined at module scope and reading the store itself.
 * `ExtraFacet.Control` is a component *type*, so building it inside the view
 * would hand `ExtraFacetControls` a new type on every store change and remount
 * the Select mid-interaction — picking a value would close its own popup.
 */
function TransferTypeSelect({ className }: { className?: string }) {
  const type = useFilters((s) => s.transferType);
  const set = useFilters((s) => s.set);

  return (
    <SingleSelect
      label="Event"
      options={TYPE_OPTIONS}
      value={type}
      defaultValue="all"
      onChange={(transferType) => set({ transferType })}
      className={className}
    />
  );
}

/**
 * Profile Activity tab: this profile's transfers, newest first, narrowed by
 * the shared facets and by the Event control over the website's `validType`.
 *
 * That control is not one of the five facets, so it rides the toolbar's
 * `extras` slot — which is the facet-parity system, not a bare `ReactNode` —
 * and therefore shows up in the mobile Filters sheet as well.
 */
export function ActivityView({ profile: live }: { profile: Profile }) {
  const filters = useFilters();
  const { scope } = useScopedFacets();
  const [active, setActive] = useState<LabObjekt | null>(null);

  // the feed is seeded off the objekts the profile held at the snapshot date,
  // and then cut again at that date: a token acquired before the cut-off can
  // still have been sent on after it, and that row is in the future
  const { profile, date } = useSnapshotProfile(live);

  const all = useMemo(() => {
    const rows = seedTransfers(profile);
    if (date === null) return rows;
    const cutoff = endOfDay(date).getTime();
    return rows.filter((r) => r.at.getTime() <= cutoff);
  }, [profile, date]);

  const rows = useMemo(
    () =>
      all.filter((r) => {
        if (filters.transferType !== "all" && r.kind !== filters.transferType) return false;
        return matchesFacets(r.objekt, filters, scope);
      }),
    [all, filters, scope],
  );

  const typeActive = filters.transferType !== "all";
  const extras = useMemo<ExtraFacet[]>(
    () => [
      { key: "transferType", label: "Event", active: typeActive, Control: TransferTypeSelect },
    ],
    [typeActive],
  );

  return (
    <>
      <ProfileToolbar
        showSearch={false}
        showSort={false}
        showColumns={false}
        extras={extras}
        extra={<SnapshotPopover nickname={profile.nickname} />}
      />

      <div className="text-muted-foreground font-mono text-[12.5px]">
        <b className="text-foreground font-semibold">{rows.length}</b> transfers
      </div>

      <DataTable columns={COLUMNS} minWidth={MIN_WIDTH}>
        <DataTableHead>
          {/* `trades_table_headers_*` */}
          <span>Date</span>
          <span>Objekt</span>
          <span>Action</span>
          <span>User</span>
        </DataTableHead>

        {rows.map((row) => (
          <TradeRow key={row.id} row={row} onOpen={setActive} />
        ))}

        {rows.length === 0 && (
          <EmptyState
            icon={ArrowsLeftRightIcon}
            title="No trades found"
            hint={
              all.length === 0
                ? `${profile.nickname} holds nothing, so there is no transfer history to show.`
                : "No mint, transfer or spin on this profile fits the current filters."
            }
            bordered={false}
            action={
              all.length > 0 ? (
                <Button variant="outline" size="sm" onClick={filters.reset}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        )}
      </DataTable>

      <ObjektDrawer objekt={active} onClose={() => setActive(null)} />
    </>
  );
}
