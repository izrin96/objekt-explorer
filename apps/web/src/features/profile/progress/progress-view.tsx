import { CaretDownIcon, ChartBarIcon, CheckIcon } from "@phosphor-icons/react";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useMemo, useState, type ReactNode } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { Shimmer } from "@/components/shared/shimmer";
import { Button } from "@/components/ui/button";
import { useCosmoArtist } from "@/features/artist/cosmo-artist-provider";
import { useFilterData } from "@/features/filters/filter-data-provider";
import { useMemberColor } from "@/features/filters/member-colors";
import { useResetFilters, useSetFilters } from "@/features/filters/use-filters";
import { ObjektDrawer } from "@/features/objekt/drawer";
import { ObjektCard } from "@/features/objekt/objekt-card";
import { ObjektGrid } from "@/features/objekt/objekt-grid";
import { getCollectionShortNo } from "@/features/objekt/objekt-utils";
import { activateOnKey } from "@/lib/a11y";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { CheckpointPopover } from "../checkpoint-popover";
import { useProfileColumns } from "../profile-provider";
import { ProfileToolbar } from "../profile-toolbar";
import { useProfileCatalogue } from "../use-profile-objekts";
import { MemberProgressChart, useChartMembers } from "./member-progress-chart";
import {
  catalogueTotals,
  memberProgress,
  shapeProgress,
  type ClassGroup,
  type MemberSeason,
  type Tally,
} from "./shape-progress";

/** Member names and seasons carry spaces and dots (`id6 X id11`), so every part
 *  is reduced to word characters before it becomes a DOM id. */
const nodeId = (...parts: string[]) =>
  `progress-${parts.map((part) => part.replace(/[^a-zA-Z0-9]+/g, "_")).join("--")}`;

function Panel({ title, children }: { title: string; children: ReactNode }) {
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

function Value({ row }: { row: Tally }) {
  return (
    <>
      <b className="text-foreground font-semibold">{row.owned}</b>/{row.total} ({row.pct.toFixed(1)}
      %)
    </>
  );
}

/**
 * `grid-template-rows: 0fr → 1fr` needs no measured height and folds away under
 * reduced motion. The content stays mounted through the collapse so there is
 * something to animate, which is why a closed region is taken out of the tab
 * order and the a11y tree explicitly — a `0fr` track still holds focusable cards.
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
  children: ReactNode;
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

/** `ObjektCard`'s box for a collection the profile does not hold, so the two sit in one grid without a seam. */
function MissingCard({
  objekt,
  onOpen,
}: {
  objekt: ValidObjekt;
  onOpen: (objekt: ValidObjekt) => void;
}) {
  const shortNo = getCollectionShortNo(objekt);

  return (
    <div className="group @container isolate flex min-w-0 flex-col gap-1.5">
      <div
        role="button"
        tabIndex={0}
        onClick={() => onOpen(objekt)}
        onKeyDown={(event) => activateOnKey(event, () => onOpen(objekt))}
        className="rounded-photocard aspect-photocard bg-secondary focus-visible:ring-ring relative w-full cursor-pointer overflow-hidden outline-none select-none focus-visible:ring-2"
      >
        <img
          src={objekt.thumbnailImage}
          alt={m.progress_not_owned_alt({ name: `${objekt.member} ${shortNo}` })}
          loading="lazy"
          decoding="async"
          draggable={false}
          className="absolute inset-0 size-full object-cover opacity-35 grayscale"
        />
        <span className="absolute bottom-[4cqw] left-[4cqw] grid h-[14cqw] place-items-center rounded-full bg-[rgba(10,12,16,.82)] px-[5cqw] font-mono text-[7cqw] font-semibold tracking-wide text-white">
          {m.progress_missing_badge()}
        </span>
      </div>
      <div className="text-muted-foreground flex min-w-0 items-baseline justify-between gap-1.5 text-xs leading-tight">
        <span className="truncate font-medium">{objekt.member}</span>
        <span className="flex-none font-mono text-[11.5px]">{shortNo}</span>
      </div>
    </div>
  );
}

/**
 * One class inside a member+season. The objekt grid it opens is a sibling of
 * the box rather than a child, so the box stays a fixed-height summary whether
 * it is open or shut and the grid gets the page's full width.
 */
function ClassCard({
  group,
  section,
  columns,
  open,
  onToggle,
  onOpen,
  ownedBySlug,
}: {
  group: ClassGroup;
  section: MemberSeason;
  columns: number;
  open: boolean;
  onToggle: () => void;
  onOpen: (objekt: ValidObjekt) => void;
  ownedBySlug: ReadonlyMap<string, ValidObjekt>;
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
           one with the value: three fixed tracks do not fit a phone */
        className={cn(
          "bg-popover hover:bg-secondary/60 grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-lg border px-3.5 py-3 text-left text-[13px] transition-colors",
          "sm:grid-cols-[7.5rem_minmax(0,1fr)_auto]",
          open && "bg-secondary/40",
        )}
        onClick={onToggle}
      >
        <span className="flex items-center gap-2 font-medium max-sm:col-span-full">
          {/* a fixed-size slot either way, so a facet taking the card to 100%
              does not shift the title */}
          <span className="grid size-2.5 flex-none place-items-center">
            {complete && (
              <>
                <CheckIcon weight="bold" className="text-muted-foreground size-2.5" aria-hidden />
                <span className="sr-only">{m.progress_class_complete({ class: group.class })}</span>
              </>
            )}
          </span>
          <span className="truncate">{group.class}</span>
        </span>

        <span className="bg-secondary block h-2 overflow-hidden rounded-sm">
          <i
            className="block h-full rounded-sm"
            style={{ width: `${Math.max(group.pct, 1.2)}%`, background: section.color }}
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

      <Region
        id={`${id}-panel`}
        label={m.progress_section_aria({ section: section.key, class: group.class })}
        open={open}
      >
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

export function ProgressView() {
  const { owned, catalogue, filters, isPending } = useProfileCatalogue();
  const { compareMember } = useCosmoArtist();
  const { compareSeason, compareClass } = useFilterData();
  const memberColor = useMemberColor();
  const columns = useProfileColumns();
  const setFilters = useSetFilters();
  const reset = useResetFilters();
  const [open, setOpen] = useState<readonly string[]>([]);
  const [active, setActive] = useState<ValidObjekt | null>(null);

  const ownedSlugs = useMemo(() => new Set(owned.map((objekt) => objekt.slug)), [owned]);
  const ownedBySlug = useMemo(() => new Map(owned.map((objekt) => [objekt.slug, objekt])), [owned]);

  const members = useChartMembers();
  const rows = useMemo(
    () => memberProgress(catalogue, ownedSlugs, members),
    [catalogue, ownedSlugs, members],
  );
  const sections = useMemo(
    () =>
      shapeProgress(catalogue, ownedSlugs, filters.member, {
        compareMember,
        compareSeason,
        compareClass,
        memberColor,
      }),
    [
      catalogue,
      ownedSlugs,
      filters.member,
      compareMember,
      compareSeason,
      compareClass,
      memberColor,
    ],
  );

  const totals = catalogueTotals(catalogue, ownedSlugs);
  // a member the catalogue holds nothing for under the current facets is still
  // a bar, but it is neither the best nor the closest to done
  const measured = rows.filter((row) => row.total > 0);
  const best = measured.toSorted((a, b) => b.pct - a.pct || b.total - a.total)[0];
  const closest = measured.toSorted((a, b) => a.total - a.owned - (b.total - b.owned)).slice(0, 3);

  const toolbar = (
    <ProfileToolbar showSearch={false} showSort={false} extra={<CheckpointPopover />} />
  );

  if (isPending) {
    return (
      <>
        {toolbar}
        <Shimmer className="h-64 w-full rounded-lg" />
      </>
    );
  }

  return (
    <>
      <div className="grid gap-3 md:grid-cols-[1.4fr_1fr]">
        <Panel title={m.progress_overall()}>
          <div className="font-mono text-3xl leading-none font-semibold tracking-tight tabular-nums">
            {totals.pct.toFixed(1)}
            <small className="text-muted-foreground text-[13px] font-medium tracking-normal">
              % · {totals.owned.toLocaleString()} / {totals.total.toLocaleString()}
            </small>
          </div>
          <Meter pct={totals.pct} />
          {best && (
            <p className="text-muted-foreground mt-2 text-xs">
              {m.progress_best_member()}: <b className="text-foreground font-mono">{best.member}</b>{" "}
              <b className="text-foreground font-mono tabular-nums">{best.pct.toFixed(0)}%</b>
            </p>
          )}
        </Panel>
        <Panel title={m.progress_closest_title()}>
          <ul className="flex flex-col gap-0.5">
            {closest.map((row) => (
              <li key={row.member}>
                {/* the same action as clicking that member's bar in the chart */}
                <button
                  type="button"
                  onClick={() => setFilters({ member: [row.member] })}
                  className="hover:bg-secondary/60 -mx-1.5 flex w-[calc(100%+--spacing(3))] cursor-pointer items-center gap-2.5 rounded-md px-1.5 py-1 text-left text-[13px]"
                >
                  <span
                    className="ring-foreground/15 size-2.5 flex-none rounded-[3px] ring-1"
                    style={{ background: row.color }}
                  />
                  <span className="truncate font-medium">{row.member}</span>
                  <span className="text-muted-foreground ml-auto flex-none font-mono text-xs tabular-nums">
                    <b className="text-foreground">{row.total - row.owned}</b> {m.progress_to_go()}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {toolbar}

      {(filters.member?.length ?? 0) === 0 ? (
        measured.length > 0 ? (
          <MemberProgressChart
            rows={rows.toSorted((a, b) => b.pct - a.pct || b.total - a.total)}
            onSelect={(member) => setFilters({ member: [member] })}
          />
        ) : (
          <EmptyState
            icon={ChartBarIcon}
            title={m.progress_empty_title()}
            hint={m.progress_empty_hint()}
            action={
              <Button variant="outline" size="sm" onClick={reset}>
                {m.filter_reset_filter()}
              </Button>
            }
          />
        )
      ) : (
        <div className="flex flex-col gap-8">
          <p className="font-mono text-[13px] font-semibold tabular-nums">
            <Value row={totals} />
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
                      columns={columns}
                      open={open.includes(key)}
                      onToggle={() =>
                        setOpen((prev) =>
                          prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
                        )
                      }
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
              title={m.progress_empty_title()}
              hint={m.progress_empty_hint()}
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters({ member: undefined })}
                >
                  {m.filter_reset_filter()}
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
