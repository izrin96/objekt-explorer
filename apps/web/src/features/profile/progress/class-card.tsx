import { CaretDownIcon, CheckIcon } from "@phosphor-icons/react";
import type { GridObjekt, ValidObjekt } from "@repo/lib/types/objekt";
import type { ReactNode } from "react";

import { AddToListMenuItem } from "@/features/list/add-to-list-menu-item";
import { ObjektCard } from "@/features/objekt/objekt-card";
import { ObjektCardMenu } from "@/features/objekt/objekt-card-menu";
import { ObjektGrid } from "@/features/objekt/objekt-grid";
import { copiesIn } from "@/features/objekt/objekt-utils";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import type { ClassGroup, MemberSeason, Tally } from "./shape-progress";

/** Member names and seasons carry spaces and dots (`id6 X id11`), so every part
 *  is reduced to word characters before it becomes a DOM id. */
const nodeId = (...parts: string[]) =>
  `progress-${parts.map((part) => part.replace(/[^a-zA-Z0-9]+/g, "_")).join("--")}`;

export function TallyValue({ row }: { row: Tally }) {
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

/**
 * One class inside a member+season. The objekt grid it opens is a sibling of
 * the box rather than a child, so the box stays a fixed-height summary whether
 * it is open or shut and the grid gets the page's full width.
 */
export function ClassCard({
  group,
  section,
  columns,
  open,
  onToggle,
  onOpen,
  ownedBySlug,
  showActions,
}: {
  group: ClassGroup;
  section: MemberSeason;
  columns: number;
  open: boolean;
  onToggle: () => void;
  onOpen: (objekt: ValidObjekt) => void;
  ownedBySlug: ReadonlyMap<string, GridObjekt[]>;
  /** a missing objekt is as addable as an owned one: it is how a want list is built */
  showActions: boolean;
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
          "bg-popover hover:bg-secondary/60 grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-lg border px-3.5 py-3 text-left text-sm transition-colors",
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
          <TallyValue row={group} />
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
            const copies = ownedBySlug.get(item.objekt.slug);
            const owned = copies?.[0];
            const menu = showActions ? (
              <ObjektCardMenu>
                <AddToListMenuItem objekts={[owned ?? item.objekt]} combined />
              </ObjektCardMenu>
            ) : null;
            return owned ? (
              <ObjektCard
                key={item.objekt.slug}
                objekt={owned}
                qty={copiesIn(copies) > 1 ? copiesIn(copies) : undefined}
                unobtainable={item.unobtainable}
                hideSerial
                onOpen={onOpen}
              >
                {menu}
              </ObjektCard>
            ) : (
              <ObjektCard
                key={item.objekt.slug}
                objekt={item.objekt}
                faded
                unobtainable={item.unobtainable}
                hideSerial
                onOpen={onOpen}
              >
                {menu}
              </ObjektCard>
            );
          })}
        </ObjektGrid>
      </Region>
    </div>
  );
}
