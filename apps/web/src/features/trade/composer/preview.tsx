import { PlusIcon } from "@phosphor-icons/react";
import type { PlanList } from "@repo/api/schemas/trade-post";
import type { ListObjekt } from "@repo/lib/types/objekt";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useId, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverPopup, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet,
  SheetDescription,
  SheetHeader,
  SheetPopup,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { toastManager } from "@/components/ui/toast";
import { useEditList, useSetRatio } from "@/features/list/actions";
import { type StoredList, toDraft, toEditInput } from "@/features/list/list-draft";
import { LIST_TYPE_LABEL, LIST_TYPE_TONE } from "@/features/list/list-type-badge";
import { listEntriesOptions, listFindOptions } from "@/features/list/queries";
import { RatioChip } from "@/features/list/ratio-chip";
import { RatioPicker } from "@/features/list/ratio-picker";
import { appliedRatio, type RatioSide, ratioName, ratioText } from "@/features/list/ratio-text";
import { listRulesOptions, RULE_KEYS } from "@/features/list/rules/queries";
import { RuleForm } from "@/features/list/rules/rule-dialog";
import { ruleInputOf } from "@/features/list/rules/rule-draft";
import { ruleText } from "@/features/list/rules/words";
import { ObjektCard } from "@/features/objekt/objekt-card";
import { collectionName } from "@/features/objekt/objekt-label";
import { VirtualCardGrid } from "@/features/objekt/virtual-card-grid";
import { client } from "@/lib/orpc";
import { refusalText } from "@/lib/refusal";
import { joinSentences } from "@/lib/text";
import { TONE_INK } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import type { PostInput } from "../composer-choice";
import { matchLines, previewTags } from "../post-kind-text";
import { TagBadges } from "../tag-label";
import { TILE } from "../thumb-grid";
import { type PreviewSide, previewSides } from "./preview-sides";

/** thumbnails before "+N", which opens the rest in the side sheet */
const SHOWN = 23;

type Rule = Awaited<ReturnType<typeof client.list.rules>>[number];

type SheetView =
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

  return (
    <section
      aria-labelledby={`${id}-heading`}
      className={cn("flex min-w-0 flex-col gap-4 rounded-xl border p-4 sm:p-5", className)}
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
        <p aria-live="polite" className="text-sm text-pretty">
          {picks ? joinSentences(matchLines(picks)) : null}
        </p>
      </div>
      {request ? (
        <div className="grid min-w-0 items-start gap-5 lg:grid-cols-2">
          {previewSides(request).map((side) =>
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
        <SheetPopup className="sm:max-w-lg" finalFocus={opener}>
          {sheet?.view === "rule" ? (
            <RuleForm
              key={sheet.session}
              slug={sheet.slug}
              listName={sheet.name}
              listRatio={sheet.listRatio}
              withRatio={sheet.withRatio}
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

  return (
    <div className="flex min-w-0 flex-col gap-2.5">
      <div className="flex min-h-7 min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1.5 sm:min-h-6">
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
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="rounded-photocard aspect-photocard w-14" />
          ))}
        </div>
      ) : total === 0 ? (
        <p className="text-muted-foreground text-xs">{m.trade_composer_side_empty()}</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {shown.map((entry) => (
            <li key={entry.entryId} className="w-14">
              <EntryThumb entry={entry} slug={slug} side={ratio} listRatio={listRatio} />
            </li>
          ))}
          {rest > 0 ? (
            <li className="@container w-14">
              <button
                type="button"
                onClick={() => onOpenSheet({ view: "all", slug, name, ratio })}
                className={cn(
                  TILE,
                  "hover:text-foreground focus-visible:ring-ring w-full text-xs tabular-nums outline-none focus-visible:ring-2",
                )}
              >
                <span aria-hidden>+{rest}</span>
                <span className="sr-only">
                  {m.trade_more_count({ count: rest.toLocaleString(getLocale()) })}
                </span>
              </button>
            </li>
          ) : null}
        </ul>
      )}
    </div>
  );
}

/** "Ratio for all" by the list's name: `list.edit` takes the whole list, so it starts from the stored one. */
function ListRatioControl({ stored, side }: { stored: StoredList; side: RatioSide }) {
  const edit = useEditList();
  const [open, setOpen] = useState(false);
  const ratio = stored.ratio ?? null;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="outline" size="xs" className="shrink-0" />}>
        {m.ratio_for_all()}
        <span className="tabular-nums">{ratio === null ? "1:1" : ratioText(ratio, side)}</span>
      </PopoverTrigger>
      <PopoverPopup className="w-80" align="end">
        <RatioPicker
          side={side}
          label={m.ratio_for_all()}
          description={side === "have" ? m.ratio_for_all_have_desc() : m.ratio_for_all_want_desc()}
          value={ratio}
          disabled={edit.isPending}
          onChange={(next) =>
            edit.mutate(toEditInput(stored.slug, { ...toDraft(stored), ratio: next }, ratio), {
              onSuccess: () => setOpen(false),
            })
          }
        />
      </PopoverPopup>
    </Popover>
  );
}

/** A thumbnail; on a side that takes a ratio, it opens a picker for that objekt's own. */
function EntryThumb({
  entry,
  slug,
  side,
  listRatio,
}: {
  entry: ListObjekt;
  slug: string;
  side: RatioSide | null;
  listRatio: number | null;
}) {
  const [open, setOpen] = useState(false);
  const applied = side ? appliedRatio(entry.ratio, listRatio) : null;
  const name = collectionName(entry.slug, entry);
  const face = (
    <>
      <ObjektCard objekt={entry} image="thumbnail" hideLabel />
      {applied && side ? (
        <RatioChip
          ratio={applied.ratio}
          side={side}
          owner
          inherited={applied.inherited}
          // opaque: in dark mode the outline badge's fill is nearly clear, and the artwork shows through
          className="text-xxs sm:text-xxs bg-background dark:bg-background pointer-events-none absolute end-0.5 bottom-0.5 h-4 px-0.5 shadow-xs sm:h-4"
        />
      ) : null}
    </>
  );
  if (!side) return <div className="@container relative">{face}</div>;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={
          applied
            ? m.trade_composer_objekt_ratio_set({
                name,
                ratio: ratioName(applied.ratio, side, {
                  owner: true,
                  inherited: applied.inherited,
                }),
              })
            : m.trade_composer_objekt_ratio({ name })
        }
        className="rounded-photocard focus-visible:ring-ring @container relative block w-full cursor-pointer outline-none focus-visible:ring-2"
      >
        {face}
      </PopoverTrigger>
      <PopoverPopup className="w-80">
        <PopoverTitle className="text-sm">{name}</PopoverTitle>
        <div className="mt-2">
          <EntryRatioPicker
            entry={entry}
            slug={slug}
            side={side}
            listRatio={listRatio}
            onDone={() => setOpen(false)}
          />
        </div>
      </PopoverPopup>
    </Popover>
  );
}

/** Mounted with the popover, so a thumbnail that stays closed holds no mutation. */
function EntryRatioPicker({
  entry,
  slug,
  side,
  listRatio,
  onDone,
}: {
  entry: ListObjekt;
  slug: string;
  side: RatioSide;
  listRatio: number | null;
  onDone: () => void;
}) {
  const setRatio = useSetRatio();
  return (
    <RatioPicker
      side={side}
      label={m.ratio_label()}
      value={entry.ratio ?? null}
      listRatio={listRatio}
      disabled={setRatio.isPending}
      onChange={(ratio) =>
        setRatio.mutate({ slug, entryIds: [entry.entryId], ratio }, { onSuccess: onDone })
      }
    />
  );
}

/** A want side's rules, each opening its own ratio where the side takes one, and Add rule. */
function PreviewRules({
  slug,
  listRatio,
  ratio,
  onAddRule,
}: {
  slug: string;
  listRatio: number | null;
  ratio: RatioSide | null;
  onAddRule: () => void;
}) {
  const { data: rules } = useQuery(listRulesOptions(slug));
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      {rules && rules.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {rules.map((rule) => (
            <li key={rule.id} className="min-w-0">
              <RuleChip rule={rule} slug={slug} listRatio={listRatio} ratio={ratio} />
            </li>
          ))}
        </ul>
      ) : null}
      <Button type="button" variant="outline" size="xs" className="w-fit" onClick={onAddRule}>
        <PlusIcon />
        {m.rule_add()}
      </Button>
    </div>
  );
}

const RULE_BOX =
  "flex max-w-64 min-w-0 flex-wrap items-center gap-1.5 rounded-lg border px-2 py-1 text-start text-xs";

function RuleChip({
  rule,
  slug,
  listRatio,
  ratio,
}: {
  rule: Rule;
  slug: string;
  listRatio: number | null;
  ratio: RatioSide | null;
}) {
  const [open, setOpen] = useState(false);
  const applied = ratio ? appliedRatio(rule.ratio, listRatio) : null;
  const text = ruleText(rule);
  const face = (
    <>
      <Badge variant="outline" size="sm" className="tracking-wide">
        {m.trade_rule_tag()}
      </Badge>
      <span className="min-w-0 text-pretty">{text}</span>
      {applied && ratio ? (
        <RatioChip ratio={applied.ratio} side={ratio} owner inherited={applied.inherited} />
      ) : null}
    </>
  );
  if (!ratio) return <div className={RULE_BOX}>{face}</div>;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          RULE_BOX,
          "hover:bg-accent/50 focus-visible:ring-ring cursor-pointer outline-none focus-visible:ring-2",
        )}
        aria-label={m.trade_composer_rule_ratio({ rule: text })}
      >
        {face}
      </PopoverTrigger>
      <PopoverPopup className="w-80">
        <PopoverTitle className="text-sm">{text}</PopoverTitle>
        <div className="mt-2">
          <RuleRatioPicker
            rule={rule}
            slug={slug}
            listRatio={listRatio}
            onDone={() => setOpen(false)}
          />
        </div>
      </PopoverPopup>
    </Popover>
  );
}

function RuleRatioPicker({
  rule,
  slug,
  listRatio,
  onDone,
}: {
  rule: Rule;
  slug: string;
  listRatio: number | null;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: async (ratio: number | null) => {
      const input = ruleInputOf(rule);
      if (!input) throw new Error("rule has no definition to send back");
      await client.list.updateRule({ slug, ruleId: rule.id, rule: input, ratio });
    },
    onSuccess: async () => {
      onDone();
      toastManager.add({ type: "success", title: m.ratio_set_success() });
      await Promise.all(RULE_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
    },
    onError: (error) => {
      toastManager.add({
        type: "error",
        title: m.ratio_set_error(),
        description: refusalText(error),
      });
    },
  });
  return (
    <RatioPicker
      side="want"
      label={m.ratio_label()}
      description={m.rule_ratio_desc()}
      value={rule.ratio}
      listRatio={listRatio}
      disabled={save.isPending}
      onChange={(ratio) => save.mutate(ratio)}
    />
  );
}

/** "+N": every objekt of a side, each opening its ratio where the side takes one. */
function AllObjekts({
  slug,
  name,
  ratio,
}: {
  slug: string;
  name: string;
  ratio: RatioSide | null;
}) {
  const { data: stored } = useQuery(listFindOptions(slug, true));
  const { data: entries } = useQuery(listEntriesOptions(slug, []));
  const listRatio = stored?.ratio ?? null;
  const count = (entries?.length ?? 0).toLocaleString(getLocale());
  return (
    <>
      <SheetHeader>
        <SheetTitle className="font-display">{m.trade_composer_all_title()}</SheetTitle>
        <SheetDescription>
          {ratio
            ? m.trade_composer_all_desc_ratio({ count, list: name })
            : m.trade_composer_all_desc({ count, list: name })}
        </SheetDescription>
      </SheetHeader>
      <div className="flex min-h-0 flex-1 flex-col px-6 pb-6">
        <VirtualCardGrid
          sections={[{ title: null, items: entries ?? [] }]}
          getKey={(entry) => String(entry.entryId)}
          renderItem={(entry) => (
            <EntryThumb entry={entry} slug={slug} side={ratio} listRatio={listRatio} />
          )}
        />
      </div>
    </>
  );
}
