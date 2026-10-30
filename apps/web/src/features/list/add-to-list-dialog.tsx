import { CheckIcon } from "@phosphor-icons/react";
import type { PublicList } from "@repo/api/schemas/list";
import { truncateAddress } from "@repo/lib/address";
import type { OwnedObjekt } from "@repo/lib/types/objekt";
import { createContext, Fragment, type ReactNode, use, useCallback, useState } from "react";

import { Note } from "@/components/shared/note";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/components/ui/number-field";
import {
  Select,
  SelectGroup,
  SelectGroupLabel,
  SelectItem,
  SelectPopup,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toastManager } from "@/components/ui/toast";
import { Toggle } from "@/components/ui/toggle";
import { ObjektCard } from "@/features/objekt/objekt-card";
import { isObjektOwned } from "@/features/objekt/objekt-utils";
import { useUserLists, useUserProfiles } from "@/features/user/hooks";
import { isSameAddress } from "@/lib/address";
import { m } from "@/paraglide/messages";

import { useAddToList } from "./actions";
import {
  type AddableObjekt,
  type AddTarget,
  addToListInput,
  currencyChanges,
  groupLists,
  isBoundHere,
  isListDisabled,
  pickableCopies,
  pickerLists,
  previewRows,
  toggleUnpicked,
  toSource,
} from "./add-to-list-source";
import { CreateListDialog } from "./create-list-dialog";
import { EMPTY_DRAFT, type ListDraft } from "./list-form";
import { ListTypeBadge } from "./list-type-badge";

export type { AddableObjekt } from "./add-to-list-source";

type OpenAddToList = (
  objekts: AddableObjekt[],
  options?: Pick<AddTarget, "combined" | "saleOnly">,
) => void;

/** rows the preview draws before folding the rest into a count */
const PREVIEW_ROWS = 12;

const AddToListContext = createContext<OpenAddToList | null>(null);

/**
 * One dialog per surface, opened from anywhere under it: a menu closes on click
 * and takes its whole popup subtree — a dialog rendered inside it included.
 */
export function AddToListProvider({
  address,
  sourceList,
  copies,
  copiesPartial = false,
  children,
}: {
  /** the profile whose objekts these are; unlocks that profile's bound lists */
  address?: string;
  /** a bound list hiding serials whose entries these are: each `id` is an entry id */
  sourceList?: string;
  /** the profile's tokens behind its combined cards, as the page shows them, to pick by serial */
  copies?: OwnedObjekt[];
  /** more pages of `copies` are still to load */
  copiesPartial?: boolean;
  children: ReactNode;
}) {
  const [target, setTarget] = useState<Omit<AddTarget, "copies" | "copiesPartial">>({
    objekts: [],
  });
  const [open, setOpen] = useState(false);

  const openAddToList = useCallback<OpenAddToList>((objekts, options) => {
    if (objekts.length === 0) return;
    setTarget({ objekts, combined: options?.combined, saleOnly: options?.saleOnly });
    setOpen(true);
  }, []);

  return (
    <AddToListContext value={openAddToList}>
      {children}
      <AddToListDialog
        open={open}
        onOpenChange={setOpen}
        target={{ ...target, copies, copiesPartial }}
        address={address}
        sourceList={sourceList}
      />
    </AddToListContext>
  );
}

export function useOpenAddToList(): OpenAddToList {
  const open = use(AddToListContext);
  if (!open) throw new Error("useOpenAddToList must be used within AddToListProvider");
  return open;
}

type DialogProps = {
  target: AddTarget;
  address?: string;
  sourceList?: string;
};

function AddToListDialog({
  open,
  onOpenChange,
  ...props
}: DialogProps & { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [slug, setSlug] = useState<string | null>(null);
  const [skipDups, setSkipDups] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState<ListDraft | undefined>(undefined);
  // up here, not in the form: a request still running when the popup closes
  // keeps its toast, and a reopened form sees it pending
  const addToList = useAddToList();

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) {
            setSlug(null);
            setSkipDups(true);
          }
          onOpenChange(next);
        }}
      >
        <DialogPopup className="max-w-md">
          <AddToListForm
            {...props}
            addToList={addToList}
            slug={slug}
            onSlugChange={setSlug}
            skipDups={skipDups}
            onSkipDupsChange={setSkipDups}
            onCreateList={(draft) => {
              setCreateDraft(draft);
              setCreateOpen(true);
            }}
            // the parent's own setter, so a successful add keeps the list picked
            onDone={() => onOpenChange(false)}
          />
        </DialogPopup>
      </Dialog>
      {/* keyed: the dialog keeps its draft between openings */}
      <CreateListDialog
        key={createDraft ? `sale:${createDraft.profileAddress}` : "any"}
        open={createOpen}
        onOpenChange={setCreateOpen}
        initial={createDraft}
      />
    </>
  );
}

/**
 * Mounted with the popup, so the unticked serials and the price start clean on
 * each opening; the picked list and Prevent duplicate live a level up.
 */
function AddToListForm({
  target,
  address,
  sourceList,
  addToList,
  slug,
  onSlugChange,
  skipDups,
  onSkipDupsChange,
  onCreateList,
  onDone,
}: DialogProps & {
  addToList: ReturnType<typeof useAddToList>;
  slug: string | null;
  onSlugChange: (slug: string | null) => void;
  skipDups: boolean;
  onSkipDupsChange: (skipDups: boolean) => void;
  onCreateList: (draft?: ListDraft) => void;
  onDone: () => void;
}) {
  const { saleOnly } = target;
  const lists = pickerLists(useUserLists(), saleOnly);
  const profiles = useUserProfiles();
  const [unpicked, setUnpicked] = useState<ReadonlySet<string>>(new Set());
  const [price, setPrice] = useState<number | null>(null);
  const [isQyop, setIsQyop] = useState(false);
  const [note, setNote] = useState("");

  const groups = groupLists(lists, address);

  const isDisabled = (list: PublicList) => isListDisabled(list, target, { address, sourceList });

  const selected = lists.find((list) => list.slug === slug && !isDisabled(list));
  const boundTo =
    selected?.isProfileBind === true ? (selected.profileAddress ?? undefined) : undefined;
  const bound = boundTo !== undefined;
  const here = selected !== undefined && isBoundHere(selected, address);
  const isSale = selected?.listType === "sale";

  const profileName = (profileAddress: string) => {
    const nickname = profiles.find((p) => isSameAddress(p.address, profileAddress))?.nickname;
    // an unnamed profile's nickname is its own address
    return nickname && !isSameAddress(nickname, profileAddress)
      ? `@${nickname}`
      : truncateAddress(profileAddress);
  };

  const pickable = pickableCopies(target, sourceList);
  // a lone copy has no choice to offer, only a way to add nothing
  const picking = here && pickable.length > 1;
  const rows = previewRows(target.objekts, picking ? pickable : []);
  const pickedCount = pickable.filter((copy) => !unpicked.has(copy.tokenId)).length;
  const source = selected ? toSource(selected, target, { address, sourceList, unpicked }) : null;

  const hint = (() => {
    if (boundTo === undefined) return null;
    const profile = profileName(boundTo);
    // another profile's tokens, or collections: the list's profile adds its own copies
    if (!here) {
      return target.objekts.some(isObjektOwned)
        ? m.list_add_own_copies({ profile })
        : m.list_add_every_copy({ profile });
    }
    if (picking) {
      return target.combined === true && target.copiesPartial === true
        ? m.list_add_copies_partial()
        : m.list_add_copies_hint();
    }
    // a combined card whose copies are not all known goes as its collection
    return source?.from.type === "collections" ? m.list_add_every_copy({ profile }) : null;
  })();

  // a price is in its list's currency: 10 typed for a KRW list is not 10 USD
  const pickList = (next: string | null) => {
    if (currencyChanges(lists, selected, next)) setPrice(null);
    onSlugChange(next);
  };

  const toggleSerial = (tokenId: string) =>
    setUnpicked((current) => toggleUnpicked(current, tokenId));

  const submit = () => {
    if (!selected || !source) return;
    const { from, dropped } = source;

    addToList.mutate(
      addToListInput({ slug: selected.slug, skipDups, from, isSale, isQyop, price, note }),
      {
        onSuccess: ({ entries, skipped, unowned: serverUnowned }) => {
          const unowned = serverUnowned + dropped;
          const owner = selected.profileAddress;
          const reasons = [
            unowned > 0 && owner !== null
              ? m.actions_add_to_list_unowned({
                  count: unowned.toLocaleString(),
                  profile: profileName(owner),
                })
              : null,
            skipped > 0 ? m.actions_add_to_list_skipped({ count: skipped.toLocaleString() }) : null,
          ].filter((reason) => reason !== null);
          toastManager.add({
            type: entries.length > 0 ? "success" : "info",
            title:
              entries.length === 1 && entries[0]
                ? m.actions_add_to_list_success_single({ collectionId: entries[0].collectionId })
                : entries.length > 1
                  ? m.actions_add_to_list_success_multiple({
                      count: entries.length.toLocaleString(),
                    })
                  : m.actions_add_to_list_nothing(),
            description: reasons.length > 0 ? reasons.join(" · ") : undefined,
          });
          onDone();
        },
      },
    );
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display">{m.list_manage_objekt_add_title()}</DialogTitle>
        <DialogDescription>
          {m.filter_selected_count({ count: target.objekts.length })}
        </DialogDescription>
      </DialogHeader>
      <DialogPanel>
        {lists.length === 0 ? (
          <Note>
            {saleOnly ? m.list_add_no_sale_list() : m.list_manage_objekt_no_list_message()}{" "}
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 underline"
              onClick={() =>
                onCreateList(
                  saleOnly
                    ? {
                        ...EMPTY_DRAFT,
                        listType: "sale",
                        isProfileBind: true,
                        profileAddress: saleOnly.profiles?.[0] ?? null,
                      }
                    : undefined,
                )
              }
            >
              {m.list_manage_objekt_create_one_here()}
            </Button>
          </Note>
        ) : (
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex min-w-0 flex-col gap-1.5">
              <Label htmlFor="add-to-list">{m.list_manage_objekt_list_label()}</Label>
              {/* the last pick outlives a successful add, and may be greyed out on this open */}
              <Select value={selected?.slug ?? null} onValueChange={pickList}>
                <SelectTrigger id="add-to-list" className="min-w-0">
                  <SelectValue placeholder={m.list_manage_objekt_list_placeholder()}>
                    {(value: string | null) => {
                      const list = lists.find((l) => l.slug === value);
                      return list ? (
                        <ListChoice
                          list={list}
                          profile={
                            list.isProfileBind && list.profileAddress !== null
                              ? profileName(list.profileAddress)
                              : undefined
                          }
                        />
                      ) : (
                        m.list_manage_objekt_list_placeholder()
                      );
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectPopup>
                  {groups.unbound.length > 0 && (
                    <SelectGroup>
                      <SelectGroupLabel>{m.list_add_group_unbound()}</SelectGroupLabel>
                      {groups.unbound.map((list) => (
                        <SelectItem key={list.slug} value={list.slug}>
                          <ListChoice list={list} />
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  {groups.bound.map((group, i) => (
                    <Fragment key={group.address}>
                      {(i > 0 || groups.unbound.length > 0) && <SelectSeparator />}
                      <SelectGroup>
                        <SelectGroupLabel className="flex items-center gap-1.5">
                          <CheckIcon weight="bold" className="size-3" aria-hidden />
                          {m.list_add_group_bound({ profile: profileName(group.address) })}
                        </SelectGroupLabel>
                        {group.lists.map((list) => (
                          <SelectItem key={list.slug} value={list.slug} disabled={isDisabled(list)}>
                            <ListChoice list={list} ownedOnly={isDisabled(list)} />
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </Fragment>
                  ))}
                </SelectPopup>
              </Select>
            </div>

            <PreviewSection
              rows={rows}
              unpicked={unpicked}
              onToggle={toggleSerial}
              copyCount={picking ? { picked: pickedCount, total: pickable.length } : null}
              hint={hint}
            />

            {isSale && selected && (
              <PriceFields
                currency={selected.currency ?? ""}
                price={price}
                onPriceChange={setPrice}
                isQyop={isQyop}
                onQyopChange={setIsQyop}
                note={note}
                onNoteChange={setNote}
              />
            )}

            {/* a bound list holds each token once, whatever this says */}
            {!bound && (
              <div className="flex min-w-0 flex-col gap-1.5">
                <Label htmlFor="add-to-list-skip-dups" className="font-normal">
                  <Checkbox
                    id="add-to-list-skip-dups"
                    checked={skipDups}
                    onCheckedChange={(checked) => onSkipDupsChange(checked)}
                  />
                  {m.list_manage_objekt_skip_dups_label()}
                </Label>
                <span className="text-muted-foreground ps-6.5 text-xs text-pretty sm:ps-6">
                  {m.list_manage_objekt_skip_dups_desc()}
                </span>
              </div>
            )}
          </div>
        )}
      </DialogPanel>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>{m.common_modal_cancel()}</DialogClose>
        <Button disabled={!source} loading={addToList.isPending} onClick={submit}>
          {m.list_manage_objekt_add_button()}
        </Button>
      </DialogFooter>
    </>
  );
}

/**
 * A list as the picker draws it: type badge and name. The closed picker also
 * names the profile a bound list follows; in the popup its group heading does.
 */
function ListChoice({
  list,
  profile,
  ownedOnly = false,
}: {
  list: PublicList;
  profile?: string;
  ownedOnly?: boolean;
}) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <ListTypeBadge type={list.listType} className="shrink-0" />
      <span className="truncate">{list.name}</span>
      {profile !== undefined && (
        // a static mark: the Bound badge's tooltip button cannot sit inside an option
        <Badge variant="outline" size="sm" className="max-w-32 min-w-0">
          <CheckIcon weight="bold" className="size-3.5 sm:size-3" aria-hidden />
          <span className="truncate">{profile}</span>
        </Badge>
      )}
      {ownedOnly && (
        <span className="text-muted-foreground shrink-0 text-xs">
          {m.list_manage_objekt_owned_only()}
        </span>
      )}
    </span>
  );
}

function PreviewSection({
  rows,
  unpicked,
  onToggle,
  copyCount,
  hint,
}: {
  rows: ReturnType<typeof previewRows>;
  unpicked: ReadonlySet<string>;
  onToggle: (tokenId: string) => void;
  copyCount: { picked: number; total: number } | null;
  hint: string | null;
}) {
  const shown = rows.slice(0, PREVIEW_ROWS);
  const hidden = rows.length - shown.length;

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{m.list_add_preview_label()}</span>
        {copyCount && (
          <span className="text-muted-foreground text-xs tabular-nums">
            {m.list_add_copies_count({
              picked: copyCount.picked.toLocaleString(),
              total: copyCount.total.toLocaleString(),
            })}
          </span>
        )}
      </div>
      <ul className="flex max-h-64 min-w-0 flex-col gap-2 overflow-y-auto rounded-lg border p-2">
        {shown.map(({ objekt, copies }) => (
          <li key={objekt.slug} className="flex min-w-0 items-start gap-2.5">
            <div className="@container w-9 shrink-0">
              <ObjektCard objekt={objekt} image="thumbnail" hideLabel hideSerial />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1 pt-0.5">
              <span className="truncate font-mono text-xs">{objekt.collectionId}</span>
              {copies.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {copies.map((copy) => (
                    <Toggle
                      key={copy.tokenId}
                      size="sm"
                      variant="outline"
                      pressed={!unpicked.has(copy.tokenId)}
                      onPressedChange={() => onToggle(copy.tokenId)}
                      className="not-data-pressed:text-muted-foreground font-mono text-xs tabular-nums not-data-pressed:line-through"
                    >
                      #{copy.serial}
                    </Toggle>
                  ))}
                </div>
              )}
            </div>
          </li>
        ))}
        {hidden > 0 && (
          <li className="text-muted-foreground text-xs">
            {m.list_add_more_rows({ count: hidden.toLocaleString() })}
          </li>
        )}
      </ul>
      {hint && <span className="text-muted-foreground text-xs text-pretty">{hint}</span>}
    </div>
  );
}

function PriceFields({
  currency,
  price,
  onPriceChange,
  isQyop,
  onQyopChange,
  note,
  onNoteChange,
}: {
  currency: string;
  price: number | null;
  onPriceChange: (price: number | null) => void;
  isQyop: boolean;
  onQyopChange: (isQyop: boolean) => void;
  note: string;
  onNoteChange: (note: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <Label
        htmlFor="add-to-list-qyop"
        className="flex items-center justify-between gap-3 font-normal"
      >
        <span className="text-sm font-medium">{m.list_manage_objekt_set_price_qyop()}</span>
        <Switch id="add-to-list-qyop" checked={isQyop} onCheckedChange={onQyopChange} />
      </Label>
      <div className="flex min-w-0 flex-col gap-1.5">
        <Label htmlFor="add-to-list-price">{m.list_manage_objekt_set_price_label()}</Label>
        <NumberField
          id="add-to-list-price"
          value={price}
          onValueChange={onPriceChange}
          min={0}
          step={1}
          largeStep={10}
          disabled={isQyop}
          format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
        >
          <div className="flex w-full items-stretch">
            <span className="bg-secondary text-muted-foreground grid w-20 shrink-0 place-items-center rounded-s-lg border border-e-0 text-sm">
              {currency}
            </span>
            <NumberFieldGroup className="rounded-s-none before:rounded-s-none">
              <NumberFieldDecrement
                className="rounded-s-none"
                aria-label={m.filter_sort_by_price_label()}
              />
              <NumberFieldInput className="tabular-nums" />
              <NumberFieldIncrement aria-label={m.filter_sort_by_price_label()} />
            </NumberFieldGroup>
          </div>
        </NumberField>
      </div>
      <div className="flex min-w-0 flex-col gap-1.5">
        <Label htmlFor="add-to-list-note">{m.list_manage_objekt_set_price_note()}</Label>
        <Input
          id="add-to-list-note"
          maxLength={255}
          placeholder={m.list_manage_objekt_set_price_note_placeholder()}
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
        />
        <span className="text-muted-foreground text-xs text-pretty">{m.list_add_price_hint()}</span>
      </div>
    </div>
  );
}
