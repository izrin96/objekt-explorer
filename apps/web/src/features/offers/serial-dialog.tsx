import { OFFER_SIDE_LIMIT, type PartnerList } from "@repo/api/schemas/offer";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { Fragment, type ReactNode, useId, useState } from "react";

import { FadeScrollArea } from "@/components/shared/fade-scroll-area";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useCosmoArtist } from "@/features/artist/use-cosmo-artist";
import { RatioChip } from "@/features/list/ratio-chip";
import { collectionName } from "@/features/objekt/collection-name";
import { CollectionLabel, SerialNo } from "@/features/objekt/objekt-label";
import { formatCount } from "@/lib/number";
import { joinList } from "@/lib/text";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import {
  type CopyGroup,
  anyControlOf,
  canSelectAll,
  clearGroup,
  confirmOf,
  dialogFooter,
  dialogRoom,
  draftOf,
  draftedTop,
  rowOf,
  rowsNameLists,
  selectAll,
  toggleAny,
  toggleCopy,
} from "./copy-groups";
import { CopyStepper } from "./copy-stepper";
import { EstimatedSerialNote } from "./estimated-serial-note";
import { offerNo } from "./format";
import { OfferThumb } from "./offer-item";
import { type OfferPick, type OfferSide, blockedReason, pickKey, toPick } from "./pick";
import { withCount } from "./quantity";

type Selection = ReadonlyMap<string, OfferPick>;

// the focus on opening goes to the first control the sender can use
const firstControl = () => {
  const first = document.querySelector<HTMLElement>("[data-serial-dialog] [data-first-control]");
  return (
    first?.querySelector<HTMLElement>("[role=checkbox], input:not([aria-hidden=true])") ?? true
  );
};

/** The copies of one collection as checkbox rows, over the picker. Cancel, Escape and a click outside leave its draft behind. */
export function SerialDialog({
  open,
  group,
  collection,
  side,
  name,
  lists,
  selection,
  opens,
  finalFocus,
  onOpenChange,
  onClosed,
  onConfirm,
}: {
  open: boolean;
  group: CopyGroup;
  collection: ValidObjekt | undefined;
  side: OfferSide;
  /** the partner */
  name: string;
  lists: readonly PartnerList[];
  /** the picker's working selection */
  selection: Selection;
  /** counts the opens, so each one starts from a fresh draft */
  opens: number;
  /** the tile that opened it, found when the dialog closes */
  finalFocus: () => HTMLElement | boolean;
  onOpenChange: (open: boolean) => void;
  /** the closing animation is over */
  onClosed: () => void;
  onConfirm: (draft: Selection) => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={(next) => {
        if (!next) onClosed();
      }}
    >
      <DialogPopup
        data-serial-dialog
        bottomStickOnMobile={false}
        finalFocus={finalFocus}
        initialFocus={firstControl}
        // full screen below `lg`, over the full-screen picker; the popup is `fixed`, not a grid cell
        className="max-lg:fixed max-lg:inset-0 max-lg:max-w-none max-lg:rounded-none max-lg:border-0 max-lg:before:hidden lg:max-h-[80dvh] lg:max-w-md"
      >
        <SerialDialogBody
          key={opens}
          group={group}
          collection={collection}
          side={side}
          name={name}
          lists={lists}
          selection={selection}
          onClose={() => onOpenChange(false)}
          onConfirm={onConfirm}
        />
      </DialogPopup>
    </Dialog>
  );
}

function SerialDialogBody({
  group,
  collection,
  side,
  name,
  lists,
  selection,
  onClose,
  onConfirm,
}: {
  group: CopyGroup;
  collection: ValidObjekt | undefined;
  side: OfferSide;
  name: string;
  lists: readonly PartnerList[];
  selection: Selection;
  onClose: () => void;
  onConfirm: (draft: Selection) => void;
}) {
  const { getArtist } = useCosmoArtist();
  const [draft, setDraft] = useState<Map<string, OfferPick>>(() => draftOf(group, selection));
  const baseId = useId();
  const fullId = `${baseId}-full`;

  const any = group.any;
  const room = dialogRoom(group, selection);
  const footer = dialogFooter(group, draft, room);
  const confirm = confirmOf(group, draft, selection);
  const label = collectionName(group.slug, collection);
  const control = anyControlOf(group, draft, room, selection);
  const canAll = canSelectAll(group, draft, room);
  const canClear = footer.picked > 0;
  const anyBlocked = control.kind === "checkbox" && control.disabled;
  const firstRow = group.shown.findIndex((item) => !rowOf(item, draft, room).disabled);
  const anyFirst = control.kind === "count" || (control.kind === "checkbox" && !anyBlocked);

  const listNames =
    side === "get"
      ? group.lists.map((slug) => lists.find((list) => list.slug === slug)?.name ?? slug)
      : [];
  const artist = collection ? (getArtist(collection.artist)?.title ?? collection.artist) : null;
  const meta =
    collection === undefined || artist === null
      ? null
      : listNames.length > 0
        ? m.offer_picker_dialog_meta_lists({
            artist,
            season: collection.season,
            lists: joinList(listNames, "compact"),
          })
        : m.offer_picker_dialog_meta({ artist, season: collection.season });
  const spansLists = side === "get" && rowsNameLists(group);
  const confirmText =
    confirm.kind === "pick"
      ? (confirm.count === 1 ? m.offer_picker_confirm_one : m.offer_picker_confirm)({
          count: formatCount(confirm.count),
        })
      : confirm.kind === "remove"
        ? m.offer_picker_confirm_remove()
        : m.offer_picker_confirm_none();

  return (
    <>
      <DialogHeader className="flex-row items-start gap-3 pe-14 max-lg:p-4">
        <OfferThumb slug={group.slug} collection={collection} className="w-14" />
        <div className="flex min-w-0 flex-col gap-1">
          <DialogTitle className="font-display text-base leading-tight break-words">
            <CollectionLabel slug={group.slug} collection={collection} />
          </DialogTitle>
          {meta ? <p className="text-muted-foreground text-xs">{meta}</p> : null}
          {group.ratio !== null ? (
            <RatioChip ratio={group.ratio} side="have" owner={false} className="self-start" />
          ) : null}
          <DialogDescription className="text-xs max-lg:sr-only">
            {side === "give"
              ? m.offer_picker_dialog_desc_mine()
              : m.offer_picker_dialog_desc_theirs({ name })}
          </DialogDescription>
        </div>
      </DialogHeader>
      <div className="flex gap-1 px-6 pb-1 max-lg:px-4">
        <Button
          variant="ghost"
          size="xs"
          // not `disabled`, which drops focus to the page when the press itself empties the row
          aria-disabled={!canAll || undefined}
          className="aria-disabled:pointer-events-none aria-disabled:opacity-64"
          onClick={() => {
            if (canAll) setDraft((current) => selectAll(group, current, room));
          }}
        >
          {m.offer_picker_select_all()}
        </Button>
        <Button
          variant="ghost"
          size="xs"
          aria-disabled={!canClear || undefined}
          className="aria-disabled:pointer-events-none aria-disabled:opacity-64"
          onClick={() => {
            if (canClear) setDraft((current) => clearGroup(group, current));
          }}
        >
          {m.offer_picker_clear()}
        </Button>
      </div>
      <FadeScrollArea className="flex-1">
        <div className="flex flex-col px-6 pb-3 max-lg:px-4">
          {any && control.kind === "count" ? (
            <div
              data-first-control={anyFirst || undefined}
              className="flex min-h-11 items-center justify-between gap-3 rounded-md px-2 py-1.5"
            >
              <span className="flex min-w-0 flex-col text-sm">
                <span className="font-medium">{m.offer_any_copy_label()}</span>
                <span className="text-muted-foreground text-xs">
                  {m.offer_any_copy_available({ count: formatCount(control.available) })}
                </span>
                {group.ratio === null && any.ratio !== undefined ? (
                  <RatioChip
                    ratio={any.ratio}
                    side="have"
                    owner={false}
                    className="mt-0.5 self-start"
                  />
                ) : null}
              </span>
              <span className="w-28 shrink-0">
                <CopyStepper
                  count={control.value}
                  max={control.top}
                  full={footer.full}
                  name={label}
                  inputLabel={m.offer_any_copy_input({ name: label })}
                  caption={null}
                  onCount={(next) =>
                    setDraft((current) =>
                      withCount(
                        current,
                        toPick(any),
                        next,
                        draftedTop(group, current, selection),
                        room,
                      ),
                    )
                  }
                />
              </span>
            </div>
          ) : null}
          {any && control.kind === "checkbox" ? (
            <Label
              data-first-control={anyFirst || undefined}
              className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 lg:min-h-9"
            >
              <Checkbox
                checked={control.checked}
                aria-disabled={anyBlocked || undefined}
                className="aria-disabled:opacity-64"
                aria-labelledby={`${baseId}-any`}
                aria-describedby={footer.full && !control.checked ? fullId : undefined}
                onCheckedChange={() => {
                  if (!anyBlocked) setDraft((current) => toggleAny(group, current));
                }}
              />
              <span id={`${baseId}-any`} className="flex min-w-0 flex-col text-sm">
                <span className="flex flex-wrap items-center gap-x-1">
                  <span>{m.offer_any_copy_label()}</span>
                  {group.ratio === null && any.ratio !== undefined ? (
                    <>
                      <span aria-hidden>·</span>
                      <RatioChip ratio={any.ratio} side="have" owner={false} />
                    </>
                  ) : null}
                </span>
                <span className="text-muted-foreground text-xs font-normal">
                  {m.offer_any_copy_their_choice()}
                </span>
              </span>
            </Label>
          ) : null}
          <ul className="flex flex-col">
            {group.shown.map((item, index) => {
              const row = rowOf(item, draft, room);
              const key = pickKey(item);
              const flag = blockedReason(item);
              const parts: ReactNode[] = [];
              if (spansLists && item.listSlug !== null) {
                parts.push(
                  lists.find((list) => list.slug === item.listSlug)?.name ?? item.listSlug,
                );
              }
              if (group.ratio === null && item.ratio !== undefined) {
                parts.push(<RatioChip ratio={item.ratio} side="have" owner={false} />);
              }
              if (flag) {
                parts.push(<span className="text-destructive-foreground">{flag}</span>);
              } else if (item.inOpenOffer.length > 0) {
                parts.push(
                  <span className="text-warning-foreground">
                    {m.offer_flag_in_open_offer({
                      offers: joinList(item.inOpenOffer.map(offerNo), "compact"),
                    })}
                  </span>,
                );
              }
              return (
                <li key={key}>
                  <Label
                    data-first-control={(!anyFirst && index === firstRow) || undefined}
                    className={cn(
                      "flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 font-normal lg:min-h-9",
                      row.disabled && "cursor-not-allowed",
                    )}
                  >
                    <Checkbox
                      checked={row.checked}
                      // focusable while unavailable, so its reason is read with it
                      aria-disabled={row.disabled || undefined}
                      className="aria-disabled:opacity-64"
                      aria-labelledby={`${baseId}-${key}`}
                      aria-describedby={
                        footer.full && flag === null && !row.checked ? fullId : undefined
                      }
                      onCheckedChange={() => {
                        if (!row.disabled) setDraft((current) => toggleCopy(group, current, item));
                      }}
                    />
                    <span
                      id={`${baseId}-${key}`}
                      className={cn(
                        "flex min-w-0 flex-wrap items-center gap-x-1 text-sm",
                        row.disabled && "text-muted-foreground",
                      )}
                    >
                      {item.serial !== null ? (
                        <SerialNo serial={item.serial} estimated={item.serialEstimated} />
                      ) : null}
                      {parts.map((part, i) => (
                        <Fragment key={i}>
                          <span aria-hidden>·</span>
                          {part}
                        </Fragment>
                      ))}
                    </span>
                  </Label>
                </li>
              );
            })}
          </ul>
          {group.shown.some((item) => item.serialEstimated && item.serial !== null) ? (
            <div className="pt-2">
              <EstimatedSerialNote />
            </div>
          ) : null}
        </div>
      </FadeScrollArea>
      <DialogFooter className="flex-row items-center max-lg:rounded-none max-lg:px-4">
        <div className="me-auto flex min-w-0 flex-col text-xs" aria-live="polite">
          <span className={cn(footer.full && "max-lg:hidden")}>
            {m.offer_picker_picked({
              picked: formatCount(footer.picked),
              count: formatCount(footer.available),
            })}
          </span>
          {footer.full ? (
            <span id={fullId} className="text-muted-foreground">
              {m.offer_picker_full()}
            </span>
          ) : (
            <span className="text-muted-foreground max-lg:hidden">
              {m.offer_picker_side_total({
                count: formatCount(footer.sideTotal),
                max: formatCount(Math.max(footer.sideTotal, OFFER_SIDE_LIMIT)),
              })}
            </span>
          )}
        </div>
        <DialogClose render={<Button variant="outline" />}>{m.common_modal_cancel()}</DialogClose>
        <Button
          disabled={confirm.kind === "idle"}
          onClick={() => {
            onConfirm(draft);
            onClose();
          }}
        >
          {confirmText}
        </Button>
      </DialogFooter>
    </>
  );
}
