import type { ListObjekt } from "@repo/lib/types/objekt";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverPopup, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { SheetDescription, SheetHeader, SheetPanel, SheetTitle } from "@/components/ui/sheet";
import { useEditList, useSetRatio } from "@/features/list/actions";
import { type StoredList, toDraft, toEditInput } from "@/features/list/list-draft";
import { listEntriesOptions, listFindOptions } from "@/features/list/queries";
import { RatioChip } from "@/features/list/ratio-chip";
import { RatioPicker } from "@/features/list/ratio-picker";
import { appliedRatio, type RatioSide, ratioLabel, ratioText } from "@/features/list/ratio-text";
import { ObjektCard } from "@/features/objekt/objekt-card";
import { collectionName } from "@/features/objekt/objekt-label";
import { PanelCardGrid } from "@/features/objekt/virtual-card-grid";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

/** "Ratio for all" by the list's name: `list.edit` takes the whole list, so it starts from the stored one. */
export function ListRatioControl({ stored, side }: { stored: StoredList; side: RatioSide }) {
  const edit = useEditList(m.ratio_set_success);
  const [open, setOpen] = useState(false);
  const ratio = stored.ratio ?? null;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={<Button variant="outline" size="xs" className="self-start" />}
        aria-label={m.trade_composer_list_ratio_set({
          ratio: ratio === null ? m.ratio_none_name() : ratioLabel(ratio, side, { owner: true }),
        })}
      >
        {m.ratio_for_all()}
        <span className="tabular-nums">{ratio === null ? "1:1" : ratioText(ratio, side)}</span>
      </PopoverTrigger>
      <PopoverPopup className="w-80" align="start">
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
export function EntryThumb({
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
                ratio: ratioLabel(applied.ratio, side, {
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

/** "+N": every objekt of a side, each opening its ratio where the side takes one. */
export function AllObjekts({
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
      <SheetPanel>
        <PanelCardGrid
          sections={[{ title: null, items: entries ?? [] }]}
          getKey={(entry) => String(entry.entryId)}
          renderItem={(entry) => (
            <EntryThumb entry={entry} slug={slug} side={ratio} listRatio={listRatio} />
          )}
        />
      </SheetPanel>
    </>
  );
}
