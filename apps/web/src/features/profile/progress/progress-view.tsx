import { ChartBarIcon } from "@phosphor-icons/react";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ExtraFacet } from "@/features/filters/facet-controls";
import { LONG_TAIL } from "@/features/filters/filter-popover";
import { TransferableToggle } from "@/features/filters/filter-toggle";
import { useResetFilters, useSetFilters } from "@/features/filters/use-filters";
import { AddToListProvider } from "@/features/list/add-to-list-dialog";
import { ObjektDrawer } from "@/features/objekt/drawer";
import { isObjektOwned } from "@/features/objekt/objekt-utils";
import { useCurrentUser } from "@/features/user/hooks";
import { m } from "@/paraglide/messages";

import { CheckpointPopover } from "../checkpoint-popover";
import { useProfileColumns, useProfile } from "../profile-provider";
import { ProfileToolbar } from "../profile-toolbar";
import { isSpinAddress, useProfileCatalogue } from "../use-profile-objekts";
import { ClassCard, TallyValue } from "./class-card";
import { MemberProgressChart } from "./member-progress-chart";
import { ProgressSummary } from "./progress-summary";
import { useProgressStats } from "./use-progress-stats";

export function ProgressView() {
  const { owned, catalogue, filters, isPending } = useProfileCatalogue();
  const profile = useProfile();
  const { data: user } = useCurrentUser();
  // a past state belongs to nobody to edit, and a signed-out visitor has nothing to act with
  const showActions = Boolean(user) && filters.at === undefined;
  const columns = useProfileColumns();
  const setFilters = useSetFilters();
  const reset = useResetFilters();
  const [open, setOpen] = useState<readonly string[]>([]);
  const [active, setActive] = useState<ValidObjekt | null>(null);

  const transferable = filters.transferable === true;
  // a fresh array each render would re-run the facet parity effect forever
  const extras = useMemo<ExtraFacet[]>(
    () => [{ key: "transferable", active: transferable, quick: true, Control: TransferableToggle }],
    [transferable],
  );

  const { ownedBySlug, rows, sections, totals, measured, best, closest } = useProgressStats(
    catalogue,
    owned,
    filters.member,
  );

  const activeOwned = useMemo(
    () => (active === null ? [] : (ownedBySlug.get(active.slug) ?? []).filter(isObjektOwned)),
    [active, ownedBySlug],
  );

  const toolbar = (
    <ProfileToolbar
      longTail={LONG_TAIL.progress}
      extras={extras}
      showSearch={false}
      showSort={false}
      hideEtcClasses
      extra={isSpinAddress(profile.address) ? undefined : <CheckpointPopover />}
    />
  );

  if (isPending) {
    return (
      <>
        {toolbar}
        <Skeleton className="h-64 w-full rounded-lg" />
      </>
    );
  }

  return (
    <AddToListProvider address={profile.address}>
      <ProgressSummary
        totals={totals}
        best={best}
        closest={closest}
        onPickMember={(member) => setFilters({ member: [member] })}
      />

      {toolbar}

      {/* the chart is the overview of the whole roster; narrowing to an artist
          is already a request for that artist's members one by one */}
      {(filters.member?.length ?? 0) === 0 && (filters.artist?.length ?? 0) === 0 ? (
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
          <p className="font-mono text-sm font-semibold tabular-nums">
            <TallyValue row={totals} />
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
                      showActions={showActions}
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

      <ObjektDrawer
        objekt={active}
        onClose={() => setActive(null)}
        // Spin is counted per collection, so it has no tokens to list
        owned={isSpinAddress(profile.address) ? undefined : activeOwned}
      />
    </AddToListProvider>
  );
}
