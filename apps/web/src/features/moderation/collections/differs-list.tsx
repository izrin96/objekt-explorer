import type { Outputs, Inputs } from "@repo/api";

import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

import { type DiffersGroup, differsGroups, expectedOf } from "./differs";
import { Swatch } from "./view-row";

type OverrideRow = Outputs["admin"]["collectionOverrides"]["overrides"][number];
type Entry = Inputs["admin"]["setCollectionColorsMany"]["entries"][number];

function numberOf(row: OverrideRow) {
  return [row.artist, row.season, row.collectionNo].join(" · ");
}

function ColourLine({ label, color }: { label: string; color: string }) {
  return (
    <span className="flex items-center gap-1.5 font-mono text-xs">
      <Swatch color={color} />
      {label}
    </span>
  );
}

/**
 * Differs from Cosmo: one entry per group of one collection number sharing the staff colour and
 * Cosmo's colour, with Pin (keep the staff colour) and Reset (take Cosmo's) for every member.
 */
export function DiffersList({
  overrides,
  busy,
  onSave,
}: {
  overrides: OverrideRow[];
  busy: boolean;
  onSave: (entries: Entry[]) => void;
}) {
  const groups = differsGroups(overrides);
  if (groups.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        {m.mod_collections_differs_empty()}
      </p>
    );
  }
  const pin = (group: DiffersGroup<OverrideRow>) =>
    onSave(
      group.members.map((row) => ({
        slug: row.slug,
        expected: expectedOf(row),
        ...(group.kind === "text" ? { textPinned: true } : { backgroundPinned: true }),
      })),
    );
  const reset = (group: DiffersGroup<OverrideRow>) =>
    onSave(
      group.members.map((row) => ({
        slug: row.slug,
        expected: expectedOf(row),
        ...(group.kind === "text" ? { textColor: null } : { backgroundColor: null }),
      })),
    );
  return (
    <ul className="bg-card flex flex-col divide-y rounded-xl border text-sm">
      {groups.map((group) => {
        const first = group.members[0]!;
        const number = numberOf(first);
        const count = group.members.length;
        return (
          <li key={group.key} className="flex flex-wrap items-start gap-x-6 gap-y-2 px-4 py-3">
            <div className="flex min-w-48 flex-col gap-0.5">
              <span className="font-medium">
                {number} ·{" "}
                {group.kind === "text"
                  ? m.mod_collections_column_text()
                  : m.mod_collections_column_background()}
              </span>
              {count > 1 ? (
                <span className="text-muted-foreground text-xs">
                  {m.mod_collections_group_members({ count: String(count) })}
                </span>
              ) : null}
            </div>
            <div className="flex flex-col gap-0.5">
              <ColourLine
                label={m.mod_collections_staff_value({ color: group.staff })}
                color={group.staff}
              />
              <ColourLine
                label={m.mod_collections_cosmo_value({ color: group.cosmo })}
                color={group.cosmo}
              />
            </div>
            <span className="text-muted-foreground min-w-0 flex-1 font-mono text-xs text-pretty">
              {group.members.map((row) => row.slug).join(", ")}
            </span>
            <div className="ms-auto flex gap-1">
              <Button
                size="xs"
                variant="outline"
                disabled={busy}
                aria-label={m.mod_collections_pin_group({
                  color: group.staff,
                  count: String(count),
                  number,
                })}
                onClick={() => pin(group)}
              >
                {m.mod_collections_pin()}
              </Button>
              <Button
                size="xs"
                variant="ghost"
                disabled={busy}
                aria-label={m.mod_collections_reset_group({
                  color: group.cosmo,
                  count: String(count),
                  number,
                })}
                onClick={() => reset(group)}
              >
                {m.mod_collections_reset()}
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
