import type { AddSource, PublicList } from "@repo/api/schemas/list";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { createContext, type ReactNode, use, useCallback, useMemo, useState } from "react";

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
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toastManager } from "@/components/ui/toast";
import { isObjektOwned } from "@/features/objekt/objekt-utils";
import { useUserLists } from "@/features/user/hooks";
import { isSameAddress } from "@/lib/address";
import { m } from "@/paraglide/messages";

import { useAddToList } from "./actions";
import { CreateListDialog } from "./create-list-dialog";
import { LIST_TYPE_LABEL } from "./list-type-badge";

/**
 * A `combined` card stands for its whole collection, so a bound list takes
 * every copy the profile owns of it rather than the one token on the card.
 */
type AddOptions = { combined?: boolean };

type OpenAddToList = (objekts: ValidObjekt[], options?: AddOptions) => void;

type AddTarget = AddOptions & { objekts: ValidObjekt[] };

const AddToListContext = createContext<OpenAddToList | null>(null);

/**
 * One dialog per surface, opened from anywhere under it: a menu closes on click
 * and takes its whole popup subtree — a dialog rendered inside it included.
 */
export function AddToListProvider({
  address,
  sourceList,
  children,
}: {
  /** the profile whose objekts these are; unlocks that profile's bound lists */
  address?: string;
  /** a bound list hiding serials whose entries these are: each `id` is an entry id */
  sourceList?: string;
  children: ReactNode;
}) {
  const [target, setTarget] = useState<AddTarget>({ objekts: [] });
  const [open, setOpen] = useState(false);

  const openAddToList = useCallback<OpenAddToList>((objekts, options) => {
    if (objekts.length === 0) return;
    setTarget({ objekts, combined: options?.combined });
    setOpen(true);
  }, []);

  return (
    <AddToListContext value={openAddToList}>
      {children}
      <AddToListDialog
        open={open}
        onOpenChange={setOpen}
        target={target}
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

/** `dropped` counts the picked objekts the source leaves out: unowned ones a bound list refuses. */
function toSource(
  list: PublicList,
  { objekts, combined }: AddTarget,
  sourceList: string | undefined,
): { from: AddSource; dropped: number } {
  if (!list.isProfileBind || combined === true) {
    return { from: { type: "collections", slugs: objekts.map((o) => o.slug) }, dropped: 0 };
  }
  if (sourceList !== undefined) {
    return {
      from: { type: "list", slug: sourceList, entryIds: objekts.map((o) => Number(o.id)) },
      dropped: 0,
    };
  }
  const owned = objekts.filter(isObjektOwned);
  return {
    from: { type: "objekts", tokenIds: owned.map((o) => o.tokenId) },
    dropped: objekts.length - owned.length,
  };
}

function AddToListDialog({
  open,
  onOpenChange,
  target,
  address,
  sourceList,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: AddTarget;
  address?: string;
  sourceList?: string;
}) {
  const lists = useUserLists();
  const addToList = useAddToList();
  const [slug, setSlug] = useState<string | null>(null);
  const [skipDups, setSkipDups] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const available = useMemo(
    () =>
      lists.filter((list) =>
        list.isProfileBind ? isSameAddress(list.profileAddress, address) : true,
      ),
    [lists, address],
  );

  // a bound list has nothing to take from collections the profile does not own
  const bindable = sourceList !== undefined || target.objekts.some(isObjektOwned);
  const isDisabled = (list: PublicList) => list.isProfileBind && !bindable;

  const selected = available.find((list) => list.slug === slug && !isDisabled(list));

  const submit = () => {
    if (!selected) return;
    const { from, dropped } = toSource(selected, target, sourceList);

    addToList.mutate(
      { slug: selected.slug, skipDups, from },
      {
        onSuccess: ({ entries, skipped: refused }) => {
          const skipped = refused + dropped;
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
            description:
              skipped > 0
                ? m.actions_add_to_list_skipped({ count: skipped.toLocaleString() })
                : undefined,
          });
          onOpenChange(false);
        },
      },
    );
  };

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
        <DialogPopup className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">{m.list_manage_objekt_add_title()}</DialogTitle>
            <DialogDescription>
              {m.filter_selected_count({ count: target.objekts.length })}
            </DialogDescription>
          </DialogHeader>
          <DialogPanel>
            {available.length === 0 ? (
              <Note>
                {m.list_manage_objekt_no_list_message()}{" "}
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 underline"
                  onClick={() => setCreateOpen(true)}
                >
                  {m.list_manage_objekt_create_one_here()}
                </Button>
              </Note>
            ) : (
              <div className="flex min-w-0 flex-col gap-4">
                <div className="flex min-w-0 flex-col gap-1.5">
                  <Label htmlFor="add-to-list">{m.list_manage_objekt_list_label()}</Label>
                  {/* the last pick outlives a successful add, and may be greyed out on this open */}
                  <Select value={selected?.slug ?? null} onValueChange={setSlug}>
                    <SelectTrigger id="add-to-list" className="min-w-0">
                      <SelectValue placeholder={m.list_manage_objekt_list_placeholder()}>
                        {(value: string | null) =>
                          value === null
                            ? m.list_manage_objekt_list_placeholder()
                            : (available.find((list) => list.slug === value)?.name ?? value)
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectPopup>
                      {available.map((list) => (
                        <SelectItem key={list.slug} value={list.slug} disabled={isDisabled(list)}>
                          <span className="truncate">{list.name}</span>
                          <span className="text-muted-foreground ml-1.5 text-xs">
                            {isDisabled(list)
                              ? m.list_manage_objekt_owned_only()
                              : LIST_TYPE_LABEL[list.listTypeNew]()}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectPopup>
                  </Select>
                </div>

                <div className="flex min-w-0 flex-col gap-1.5">
                  <Label htmlFor="add-to-list-skip-dups" className="font-normal">
                    <Checkbox
                      id="add-to-list-skip-dups"
                      checked={skipDups}
                      onCheckedChange={(checked) => setSkipDups(checked)}
                    />
                    {m.list_manage_objekt_skip_dups_label()}
                  </Label>
                  <span className="text-muted-foreground ps-6.5 text-xs text-pretty sm:ps-6">
                    {m.list_manage_objekt_skip_dups_desc()}
                  </span>
                </div>
              </div>
            )}
          </DialogPanel>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              {m.common_modal_cancel()}
            </DialogClose>
            <Button disabled={!selected} loading={addToList.isPending} onClick={submit}>
              {m.list_manage_objekt_add_button()}
            </Button>
          </DialogFooter>
        </DialogPopup>
      </Dialog>
      <CreateListDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
