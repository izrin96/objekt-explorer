import { CaretDownIcon, ChartBarIcon, CheckIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";

import { useScopedFacets } from "@/components/filters/facets";
import { matchesFacets, useFilters } from "@/components/filters/filter-store";
import { ObjektCard } from "@/components/objekt-card";
import { ObjektDrawer } from "@/components/objekt-drawer";
import { ObjektGrid } from "@/components/objekt-grid";
import { MemberProgressChart } from "@/components/profile/member-progress-chart";
import type { Profile } from "@/components/profile/profile-data";
import { ProfileToolbar, SnapshotPopover } from "@/components/profile/profile-toolbar";
import {
  type ClassGroup,
  memberProgress,
  type MemberSeason,
  seasonRank,
  shapeProgress,
  type Tally,
} from "@/components/profile/progress-data";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { type LabObjekt, objekts } from "@/fixtures/objekts";
import { activateOnKey } from "@/lib/a11y";
import { collectionShortNo } from "@/lib/objekt";
import { cn } from "@/lib/utils";
import { useSnapshotProfile } from "@/store/snapshot";

/**
 * Stable DOM id for a class card's disclosure. Member names and seasons carry
 * spaces and dots in the catalogue (`id6 X id11`), so every part is reduced to
 * word characters and the parts are joined with a separator no part can
 * produce.
 */
const nodeId = (...parts: string[]) =>
  `progress-${parts.map((p) => p.replace(/[^a-zA-Z0-9]+/g, "_")).join("--")}`;

/** switches a key in a set-as-array */
const toggleKey = (prev: readonly string[], key: string) =>
  prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-popover rounded-lg border px-4 py-3.5">
      <h2 className="font-display text-foreground/80 mb-2.5 text-[13px] font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Meter({ pct, color }: { pct: number; color?: string }) {
  return (
    <div className="bg-secondary mt-2.5 h-1.5 overflow-hidden rounded-sm">
      <i
        className="bg-foreground block h-full rounded-sm"
        style={{ width: `${Math.max(pct, 1.2)}%`, background: color }}
      />
    </div>
  );
}

/** `owned/total (pct%)`, identical on a complete and an incomplete row */
function Value({ row }: { row: Tally }) {
  return (
    <>
      <b className="text-foreground font-semibold">{row.owned}</b>/{row.total} ({row.pct.toFixed(1)}
      %)
    </>
  );
}

/**
 * A disclosure body. `grid-template-rows: 0fr → 1fr` needs no measured height
 * and folds away under `prefers-reduced-motion`. The content stays mounted
 * through the collapse so there is something to animate, which means a closed
 * region has to be taken out of the tab order and the a11y tree explicitly —
 * a `0fr` track still holds focusable cards.
 */
function Region({
  id,
  label,
  open,
  children,
}: {
  id: string;
  label: string;
  open: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      role="region"
      aria-label={label}
      inert={!open}
      className={cn(
        "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
      )}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}

/**
 * A collection this profile does not hold. Same box as `ObjektCard` so the two
 * sit in one grid without a seam, with the art desaturated and dimmed and a
 * `MISSING` tag where the owned card carries its qty pill. It is still
 * clickable: the drawer opens in collection mode (no serial), which is the one
 * place the tab can say what the objekt actually is.
 */
function MissingCard({
  objekt,
  onOpen,
}: {
  objekt: LabObjekt;
  onOpen: (objekt: LabObjekt) => void;
}) {
  return (
    <div className="group @container isolate flex min-w-0 flex-col gap-1.5">
      <div
        role="button"
        tabIndex={0}
        onClick={() => onOpen(objekt)}
        onKeyDown={(e) => activateOnKey(e, () => onOpen(objekt))}
        className="rounded-photocard aspect-photocard bg-secondary focus-visible:ring-ring relative w-full cursor-pointer overflow-hidden outline-none select-none focus-visible:ring-2"
      >
        <img
          src={objekt.thumbnailImage}
          alt={`${objekt.member} ${collectionShortNo(objekt)} — not owned`}
          loading="lazy"
          decoding="async"
          draggable={false}
          className="absolute inset-0 size-full object-cover opacity-35 grayscale"
        />
        <span className="absolute bottom-[4cqw] left-[4cqw] grid h-[14cqw] place-items-center rounded-full bg-[rgba(10,12,16,.82)] px-[5cqw] font-mono text-[7cqw] font-semibold tracking-wide text-white">
          MISSING
        </span>
      </div>

      <div className="text-muted-foreground flex min-w-0 items-baseline justify-between gap-1.5 text-xs leading-tight">
        <span className="truncate font-medium">{objekt.member}</span>
        <span className="flex-none font-mono text-[11.5px]">{collectionShortNo(objekt)}</span>
      </div>
    </div>
  );
}

/**
 * One class inside a member+season: a rounded box carrying the title, a bar in
 * the member's colour, `owned/total (pct%)`, a chevron, and a check glyph at
 * 100%.
 *
 * The objekt grid it opens is rendered *below* the box as a sibling rather
 * than inside it, so the card stays a fixed-height summary whether it is open
 * or shut and the grid gets the page's full width instead of the card's
 * padding box.
 */
function ClassCard({
  group,
  section,
  color,
  columns,
  open,
  onToggle,
  onOpen,
  ownedBySlug,
}: {
  group: ClassGroup;
  section: MemberSeason;
  color: string;
  columns: number;
  open: boolean;
  onToggle: () => void;
  onOpen: (objekt: LabObjekt) => void;
  ownedBySlug: ReadonlyMap<string, LabObjekt>;
}) {
  const id = nodeId(section.key, group.class);
  const complete = group.pct >= 100;

  return (
    <div className="flex flex-col">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        /* below `sm` the title takes the whole row and the bar shares the next
           one with the value label: three fixed tracks do not fit a phone */
        className={cn(
          "bg-popover hover:bg-secondary/60 grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-lg border px-3.5 py-3 text-left text-[13px] transition-colors",
          "sm:grid-cols-[7.5rem_minmax(0,1fr)_auto]",
          open && "bg-secondary/40",
        )}
        onClick={onToggle}
      >
        <span className="flex items-center gap-2 font-medium max-sm:col-span-full">
          {/* the only completion cue; a fixed-size slot either way, so a facet
              taking the card to 100% does not shift the title */}
          <span className="grid size-2.5 flex-none place-items-center">
            {complete && (
              <>
                <CheckIcon weight="bold" className="text-muted-foreground size-2.5" aria-hidden />
                <span className="sr-only">{group.class} complete.</span>
              </>
            )}
          </span>
          <span className="truncate">{group.class}</span>
        </span>

        <span className="bg-secondary block h-2 overflow-hidden rounded-sm">
          <i
            className="block h-full rounded-sm"
            style={{ width: `${Math.max(group.pct, 1.2)}%`, background: color }}
          />
        </span>

        <span className="text-muted-foreground flex items-center gap-1.5 font-mono text-xs tabular-nums">
          <Value row={group} />
          <CaretDownIcon
            className={cn(
              "size-3.5 shrink-0 opacity-60 transition-transform motion-reduce:transition-none",
              open && "rotate-180",
            )}
          />
        </span>
      </button>

      {/* outside the card's box, not inside it */}
      <Region id={`${id}-panel`} label={`${section.key} ${group.class} objekts`} open={open}>
        <ObjektGrid columns={columns} className="mt-3">
          {group.items.map((item) => {
            const owned = ownedBySlug.get(item.objekt.slug);
            return owned ? (
              <ObjektCard key={item.objekt.slug} objekt={owned} onOpen={onOpen} />
            ) : (
              <MissingCard key={item.objekt.slug} objekt={item.objekt} onOpen={onOpen} />
            );
          })}
        </ObjektGrid>
      </Region>
    </div>
  );
}

/**
 * Progress tab, following `apps/website`'s structure: a member chart while no
 * member is selected, and — once the toolbar's Member facet has one — a
 * `Member Season` section per pair, each holding one collapse card per class.
 *
 * Every number on the page is measured against the collection catalogue
 * narrowed by the same `matchesFacets` the collection grid runs, so the
 * toolbar's Season / Class / Collection facets move the chart, the panels and
 * the sections together.
 */
export function ProgressView({ profile: live }: { profile: Profile }) {
  const filters = useFilters();
  const { scope } = useScopedFacets();
  // owned/total: only the numerator is a snapshot, the catalogue is not
  const { profile } = useSnapshotProfile(live);
  const [open, setOpen] = useState<readonly string[]>([]);
  const [active, setActive] = useState<LabObjekt | null>(null);

  const catalogue = useMemo(
    () => objekts.filter((o) => matchesFacets(o, filters, scope)),
    [filters, scope],
  );

  const rows = useMemo(
    () => memberProgress(catalogue, profile.objekts),
    [catalogue, profile.objekts],
  );
  const sections = useMemo(
    () => shapeProgress(catalogue, profile.objekts),
    [catalogue, profile.objekts],
  );

  /** the owned token for a collection, so an owned card carries its serial */
  const ownedBySlug = useMemo(
    () => new Map(profile.objekts.map((o) => [o.slug, o])),
    [profile.objekts],
  );

  const owned = rows.reduce((n, r) => n + r.owned, 0);
  const total = rows.reduce((n, r) => n + r.total, 0);
  const overall = total > 0 ? (owned / total) * 100 : 0;
  const best = rows[0];
  const closest = [...rows].sort((a, b) => a.total - a.owned - (b.total - b.owned)).slice(0, 3);

  // the newest season still in scope, rather than a hardcoded one that a
  // Season facet can filter away
  const season = useMemo(() => {
    const name = catalogue
      .map((o) => o.season)
      .reduce<string | undefined>(
        (best, s) => (best === undefined || seasonRank(s) < seasonRank(best) ? s : best),
        undefined,
      );
    const rowsInSeason = catalogue.filter((o) => o.season === name);
    const ownedSlugs = new Set(profile.objekts.map((o) => o.slug));
    return {
      name,
      owned: rowsInSeason.filter((o) => ownedSlugs.has(o.slug)).length,
      total: rowsInSeason.length,
    };
  }, [catalogue, profile.objekts]);

  return (
    <>
      <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr]">
        <Panel title={`Overall · ${scope.join(", ")}`}>
          <div className="font-mono text-3xl leading-none font-semibold tracking-tight tabular-nums">
            {overall.toFixed(1)}
            <small className="text-muted-foreground text-[13px] font-medium tracking-normal">
              % · {owned.toLocaleString()} / {total.toLocaleString()}
            </small>
          </div>
          <Meter pct={overall} />
          {best && (
            <p className="text-muted-foreground mt-2 text-xs">
              Best member: <b className="text-foreground font-mono">{best.member}</b> at{" "}
              <b className="text-foreground font-mono tabular-nums">{best.pct.toFixed(0)}%</b>
            </p>
          )}
        </Panel>
        <Panel title="Closest to complete">
          <ul className="flex flex-col gap-0.5">
            {closest.map((r) => (
              <li key={r.member}>
                {/* same action as clicking that member's bar in the chart */}
                <button
                  type="button"
                  onClick={() => filters.set({ member: [r.member] })}
                  className="hover:bg-secondary/60 -mx-1.5 flex w-[calc(100%+--spacing(3))] cursor-pointer items-center gap-2.5 rounded-md px-1.5 py-1 text-left text-[13px]"
                >
                  <span
                    className="ring-foreground/15 size-2.5 flex-none rounded-[3px] ring-1"
                    style={{ background: r.color }}
                  />
                  <span className="truncate font-medium">{r.member}</span>
                  <span className="text-muted-foreground ml-auto flex-none font-mono text-xs tabular-nums">
                    <b className="text-foreground">{r.total - r.owned}</b> to go
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title={`This season · ${season.name ?? "—"}`}>
          <div className="font-mono text-3xl leading-none font-semibold tracking-tight tabular-nums">
            {season.total > 0 ? ((season.owned / season.total) * 100).toFixed(1) : "0.0"}
            <small className="text-muted-foreground text-[13px] font-medium tracking-normal">
              % · {season.owned} / {season.total}
            </small>
          </div>
          <Meter pct={season.total > 0 ? (season.owned / season.total) * 100 : 0} />
          <p className="text-muted-foreground mt-2 text-xs">
            <b className="text-foreground font-mono">{season.total - season.owned}</b> still missing
          </p>
        </Panel>
      </div>

      <ProfileToolbar
        showSearch={false}
        sorts={null}
        sortLabel="Completion"
        extra={<SnapshotPopover nickname={profile.nickname} />}
      />

      {filters.member.length === 0 ? (
        rows.length > 0 ? (
          <MemberProgressChart
            rows={rows}
            onSelect={(member) => filters.set({ member: [member] })}
          />
        ) : (
          <EmptyState
            icon={ChartBarIcon}
            title="Nothing to measure"
            hint="No collection in the catalogue is in scope under the current filters, so there is no completion to show."
            action={
              <Button variant="outline" size="sm" onClick={filters.reset}>
                Clear filters
              </Button>
            }
          />
        )
      ) : (
        <div className="flex flex-col gap-8">
          <p className="font-mono text-[13px] font-semibold tabular-nums">
            <Value row={{ owned, total, pct: overall }} />
          </p>

          {sections.map((section) => (
            <section key={section.key} className="flex flex-col gap-4">
              <h2 className="font-display flex items-center gap-2 text-base font-semibold">
                <span
                  className="ring-foreground/15 size-2.5 flex-none rounded-[3px] ring-1"
                  style={{ background: section.color }}
                />
                {section.key}
              </h2>

              <div className="flex flex-col gap-4">
                {section.classes.map((group) => {
                  const key = `${section.key}|${group.class}`;
                  return (
                    <ClassCard
                      key={key}
                      group={group}
                      section={section}
                      color={section.color}
                      columns={filters.columns}
                      open={open.includes(key)}
                      onToggle={() => setOpen((prev) => toggleKey(prev, key))}
                      onOpen={setActive}
                      ownedBySlug={ownedBySlug}
                    />
                  );
                })}
              </div>
            </section>
          ))}

          {sections.length === 0 && (
            <EmptyState
              icon={ChartBarIcon}
              title="Nothing to measure"
              hint={`The catalogue has no collection for ${filters.member.join(", ")} under the current filters.`}
              action={
                <Button variant="outline" size="sm" onClick={() => filters.set({ member: [] })}>
                  Clear member
                </Button>
              }
            />
          )}
        </div>
      )}

      <ObjektDrawer objekt={active} onClose={() => setActive(null)} />
    </>
  );
}
