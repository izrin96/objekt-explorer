import type { PublicList } from "@repo/api/schemas/list";
import type { OwnedObjekt } from "@repo/lib/types/objekt";
import { createContext, type ReactNode, use, useCallback, useState } from "react";

import { Note } from "@/components/shared/note";
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
import { Label } from "@/components/ui/label";
import { toastManager } from "@/components/ui/toast";
import { useUserLists, useUserProfiles } from "@/features/user/hooks";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import { useAddToList } from "./actions";
import { ListPicker } from "./add-to-list-picker";
import { PreviewSection } from "./add-to-list-preview";
import {
  type AddableObjekt,
  type AddTarget,
  addToListInput,
  currencyChanges,
  isBoundHere,
  isListDisabled,
  pickableCopies,
  pickerLists,
  previewRows,
  toggleUnpicked,
  toSource,
} from "./add-to-list-source";
import { addedToast, addHint, profileLabel } from "./add-to-list-text";
import { CreateListDialog } from "./create-list-dialog";
import { EMPTY_DRAFT, type ListDraft } from "./list-form";
import { PriceFields, type PriceValue } from "./price-fields";

export type { AddableObjekt } from "./add-to-list-source";

const EMPTY_PRICE: PriceValue = { price: null, isQyop: false, note: "" };

type OpenAddToList = (
  objekts: AddableObjekt[],
  options?: Pick<AddTarget, "combined" | "saleOnly">,
) => void;

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
      <CreateListDialog open={createOpen} onOpenChange={setCreateOpen} initial={createDraft} />
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
  const [priceValue, setPriceValue] = useState<PriceValue>(EMPTY_PRICE);

  const isDisabled = (list: PublicList) => isListDisabled(list, target, { address, sourceList });

  const selected = lists.find((list) => list.slug === slug && !isDisabled(list));
  const boundTo =
    selected?.isProfileBind === true ? (selected.profileAddress ?? undefined) : undefined;
  const bound = boundTo !== undefined;
  const here = selected !== undefined && isBoundHere(selected, address);
  const isSale = selected?.listType === "sale";

  const profileName = (profileAddress: string) => profileLabel(profiles, profileAddress);

  const pickable = pickableCopies(target, sourceList);
  // a lone copy has no choice to offer, only a way to add nothing
  const picking = here && pickable.length > 1;
  const rows = previewRows(target.objekts, picking ? pickable : []);
  const pickedCount = pickable.filter((copy) => !unpicked.has(copy.tokenId)).length;
  const source = selected ? toSource(selected, target, { address, sourceList, unpicked }) : null;

  const hint = addHint({
    target,
    profile: boundTo === undefined ? null : profileName(boundTo),
    here,
    picking,
    source,
  });

  // a price is in its list's currency: 10 typed for a KRW list is not 10 USD
  const pickList = (next: string | null) => {
    if (currencyChanges(lists, selected, next)) setPriceValue((v) => ({ ...v, price: null }));
    onSlugChange(next);
  };

  const toggleSerial = (tokenId: string) =>
    setUnpicked((current) => toggleUnpicked(current, tokenId));

  const submit = () => {
    if (!selected || !source) return;
    const { from, dropped } = source;

    addToList.mutate(
      addToListInput({ slug: selected.slug, skipDups, from, isSale, ...priceValue }),
      {
        onSuccess: (result) => {
          toastManager.add(
            addedToast(result, { dropped, owner: selected.profileAddress, profileName }),
          );
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
          {m.filter_selected_count({ count: target.objekts.length.toLocaleString(getLocale()) })}
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
              <ListPicker
                lists={lists}
                address={address}
                value={selected?.slug ?? null}
                onValueChange={pickList}
                isDisabled={isDisabled}
                profileName={profileName}
              />
            </div>

            <PreviewSection
              rows={rows}
              unpicked={unpicked}
              onToggle={toggleSerial}
              copyCount={picking ? { picked: pickedCount, total: pickable.length } : null}
              hint={hint}
            />

            {isSale && selected && (
              <div className="flex min-w-0 flex-col gap-3">
                <PriceFields
                  currency={selected.currency ?? ""}
                  value={priceValue}
                  onChange={setPriceValue}
                  noteHint={
                    <span className="text-muted-foreground text-xs text-pretty">
                      {m.list_add_price_hint()}
                    </span>
                  }
                />
              </div>
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
