import { PencilSimpleIcon, PlusIcon } from "@phosphor-icons/react";
import type { PlanList } from "@repo/api/schemas/trade-post";
import { useQuery } from "@tanstack/react-query";
import { type ReactNode, useId, useRef, useState } from "react";

import { MoreCount } from "@/components/shared/more-count";
import { Button } from "@/components/ui/button";
import { Sheet, SheetPopup } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { EditListDialog } from "@/features/list/edit-list-dialog";
import { LIST_TYPE_LABEL, LIST_TYPE_TONE } from "@/features/list/list-type-badge";
import { listEntriesOptions, listFindOptions } from "@/features/list/queries";
import { type RatioSide } from "@/features/list/ratio-text";
import { RuleForm, SHEET_PARTS } from "@/features/list/rules/rule-dialog";
import { TagBadges } from "@/features/list/tag-label";
import { joinSentences } from "@/lib/text";
import { TONE_INK } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import type { PostInput } from "../composer-choice";
import { matchLines, previewTags } from "../post-kind-text";
import { TILE } from "../thumb-grid";
import { AddObjektsSheet } from "./add-objekts";
import { AllObjekts, EntryThumb, ListRatioControl, useSideDialogs } from "./preview-entries";
import { PreviewRules } from "./preview-rules";
import { type PreviewSide, previewSides } from "./preview-sides";

/** thumbnails before "+N", which opens the rest in the side sheet; the Add objekts tile comes first */
const SHOWN = 22;

type SheetView =
  | { view: "add"; slug: string; name: string }
  | { view: "rule"; slug: string; name: string; listRatio: number | null; withRatio: boolean }
  | { view: "all"; slug: string; name: string; ratio: RatioSide | null };

/**
 * The post as Trade will show it, built from the picks: its tags, who it matches, and each side's
 * list with its objekts and, on a want side, its rules. Rules and ratios save from here at once.
 */
export function ComposerPreview({
  request,
  lists,
  className,
}: {
  /** null until a kind is picked */
  request: PostInput | null;
  lists: PlanList[];
  className?: string;
}) {
  const id = useId();
  // the view outlives a close, so the sheet keeps its content while it animates out
  const [sheet, setSheet] = useState<(SheetView & { session: number }) | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  // opened from code, not a trigger, so the sheet is told where focus goes back to
  const opener = useRef<HTMLElement | null>(null);
  const openSheet = (view: SheetView) => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSheet((prev) => ({ ...view, session: (prev?.session ?? 0) + 1 }));
    setSheetOpen(true);
  };

  const picks = request
    ? {
        kind: request.kind,
        have: request.have !== null,
        want: request.want !== null,
        sale: request.sale !== null,
        alsoPay: request.alsoPay,
        alsoSwap: request.alsoSwap === true,
      }
    : null;
  const nameOf = (slug: string) => lists.find((list) => list.slug === slug)?.name ?? slug;
  const sides = request ? previewSides(request) : [];

  return (
    <section
      aria-labelledby={`${id}-heading`}
      className={cn(
        "flex min-w-0 flex-col gap-4 rounded-xl border p-4 max-md:**:scroll-mb-24 sm:p-5",
        className,
      )}
    >
      <div className="flex flex-col gap-0.5">
        <h2 id={`${id}-heading`} className="font-display text-base font-semibold">
          {m.trade_composer_preview_heading()}
        </h2>
        <p className="text-muted-foreground text-xs text-pretty">
          {m.trade_composer_preview_desc()}
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        {picks ? <TagBadges tags={previewTags(picks)} /> : null}
        {/* mounted from the start and polite, so the match line reads out as the picks change it */}
        <p aria-live="polite" className="max-w-prose text-sm text-pretty">
          {picks ? joinSentences(matchLines(picks)) : null}
        </p>
      </div>
      {request ? (
        <div className={cn("grid min-w-0 items-start gap-5", sides.length > 1 && "lg:grid-cols-2")}>
          {sides.map((side) =>
            side.slug === null ? (
              <EmptySide key={side.role} role={side.role} />
            ) : (
              <PickedSide
                key={side.role}
                side={{ ...side, slug: side.slug }}
                name={nameOf(side.slug)}
                onOpenSheet={openSheet}
              />
            ),
          )}
        </div>
      ) : null}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetPopup
          side={sheet?.view === "add" ? "bottom" : "right"}
          // a set height gives the picker's grid a bounded scroller; a phone takes all but the viewport's top gap
          className={
            sheet?.view === "add"
              ? "h-[88dvh] max-sm:h-[calc(100dvh-(--spacing(12)))]"
              : sheet?.view === "all"
                ? "sm:max-w-3xl"
                : "sm:max-w-lg"
          }
          finalFocus={opener}
        >
          {sheet?.view === "add" ? (
            <AddObjektsSheet
              key={sheet.session}
              slug={sheet.slug}
              name={sheet.name}
              onDone={() => setSheetOpen(false)}
            />
          ) : sheet?.view === "rule" ? (
            <RuleForm
              key={sheet.session}
              slug={sheet.slug}
              listName={sheet.name}
              listRatio={sheet.listRatio}
              withRatio={sheet.withRatio}
              parts={SHEET_PARTS}
              onDone={() => setSheetOpen(false)}
            />
          ) : sheet?.view === "all" ? (
            <AllObjekts
              key={sheet.session}
              slug={sheet.slug}
              name={sheet.name}
              ratio={sheet.ratio}
            />
          ) : null}
        </SheetPopup>
      </Sheet>
    </section>
  );
}

const THUMB_GRID = "grid grid-cols-[repeat(auto-fill,minmax(3.5rem,1fr))] gap-1.5";

function SideHeading({ role, children }: { role: PreviewSide["role"]; children?: ReactNode }) {
  return (
    <h3
      className={cn(
        "flex min-w-0 items-baseline gap-1.5 text-xs uppercase",
        TONE_INK[LIST_TYPE_TONE[role]],
      )}
    >
      <span className="shrink-0">{LIST_TYPE_LABEL[role]()}</span>
      {children}
    </h3>
  );
}

function EmptySide({ role }: { role: PreviewSide["role"] }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-lg border border-dashed p-3">
      <SideHeading role={role} />
      <p className="text-muted-foreground text-sm">{m.trade_composer_side_pick()}</p>
    </div>
  );
}

function PickedSide({
  side,
  name,
  onOpenSheet,
}: {
  side: PreviewSide & { slug: string };
  name: string;
  onOpenSheet: (view: SheetView) => void;
}) {
  const { slug, role, ratio } = side;
  const { data: stored } = useQuery(listFindOptions(slug, true));
  // every artist: the preview shows the whole list, as the post does
  const entries = useQuery(listEntriesOptions(slug, []));
  const listRatio = stored?.ratio ?? null;
  const total = entries.data?.length ?? 0;
  const shown = entries.data?.slice(0, SHOWN) ?? [];
  const rest = total - shown.length;
  const [editOpen, setEditOpen] = useState(false);
  // Safari doesn't focus a clicked button, so the dialog's default return would land on the page
  const editButton = useRef<HTMLButtonElement>(null);
  const addTile = useRef<HTMLButtonElement>(null);
  const { actions, dialogs } = useSideDialogs({ slug, stored, side: ratio, fallback: addTile });

  return (
    <div className="flex min-w-0 flex-col gap-2.5">
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex min-w-0 items-center gap-1">
          <SideHeading role={role}>
            <span aria-hidden className="text-muted-foreground shrink-0">
              ·
            </span>
            <span className="text-foreground min-w-0 truncate normal-case" title={name}>
              {name}
            </span>
            {entries.data ? (
              <span className="text-muted-foreground shrink-0 tabular-nums">
                {total.toLocaleString(getLocale())}
              </span>
            ) : null}
          </SideHeading>
          <Button
            ref={editButton}
            variant="ghost"
            size="icon-xs"
            className="shrink-0"
            aria-label={m.trade_composer_edit_list({ list: name })}
            title={m.trade_composer_edit_list({ list: name })}
            onClick={() => setEditOpen(true)}
          >
            <PencilSimpleIcon />
          </Button>
        </div>
        {ratio && stored ? <ListRatioControl stored={stored} side={ratio} /> : null}
      </div>

      {role === "want" ? (
        <PreviewRules
          slug={slug}
          listRatio={listRatio}
          ratio={ratio}
          onAddRule={() =>
            onOpenSheet({ view: "rule", slug, name, listRatio, withRatio: ratio !== null })
          }
        />
      ) : null}

      {entries.isPending ? (
        <div className={THUMB_GRID}>
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="rounded-photocard aspect-photocard" />
          ))}
        </div>
      ) : (
        <ul data-entry-grid="" className={THUMB_GRID}>
          <li className="@container min-w-0">
            <button
              ref={addTile}
              type="button"
              aria-label={m.trade_composer_add_tile({ list: name })}
              title={m.trade_composer_add_tile({ list: name })}
              onClick={() => onOpenSheet({ view: "add", slug, name })}
              className={cn(
                TILE,
                "hover:text-foreground hover:border-foreground/40 hover:bg-muted focus-visible:ring-ring w-full border border-dashed bg-transparent outline-none focus-visible:ring-2",
              )}
            >
              <PlusIcon aria-hidden className="size-5" />
            </button>
          </li>
          {shown.map((entry) => (
            <li key={entry.entryId} className="min-w-0">
              <EntryThumb entry={entry} side={ratio} listRatio={listRatio} actions={actions} />
            </li>
          ))}
          {rest > 0 ? (
            <li className="@container min-w-0">
              <button
                type="button"
                data-entry-more=""
                onClick={() => onOpenSheet({ view: "all", slug, name, ratio })}
                className={cn(
                  TILE,
                  "hover:text-foreground focus-visible:ring-ring w-full text-xs tabular-nums outline-none focus-visible:ring-2",
                )}
              >
                <MoreCount count={rest} />
              </button>
            </li>
          ) : null}
        </ul>
      )}
      <EditListDialog
        slug={slug}
        open={editOpen}
        onOpenChange={setEditOpen}
        showTradeLine={false}
        finalFocus={editButton}
      />
      {dialogs}
    </div>
  );
}
