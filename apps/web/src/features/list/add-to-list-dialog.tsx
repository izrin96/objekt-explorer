import type { PublicList } from "@repo/api/schemas/list";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { createContext, type ReactNode, use, useCallback, useMemo, useState } from "react";

import { Note } from "@/components/shared/note";
import { Button } from "@/components/ui/button";
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
import { m } from "@/paraglide/messages";

import { useAddObjektsToList } from "./actions";
import { CreateListDialog } from "./create-list-dialog";
import { LIST_TYPE_LABEL } from "./list-type-badge";

const AddToListContext = createContext<((objekts: ValidObjekt[]) => void) | null>(null);

/**
 * One dialog per surface, opened from anywhere under it: a menu closes on click
 * and takes its whole popup subtree — a dialog rendered inside it included.
 */
export function AddToListProvider({
  address,
  children,
}: {
  /** the profile whose objekts these are; unlocks that profile's bound lists */
  address?: string;
  children: ReactNode;
}) {
  const [objekts, setObjekts] = useState<ValidObjekt[]>([]);
  const [open, setOpen] = useState(false);

  const openAddToList = useCallback((next: ValidObjekt[]) => {
    if (next.length === 0) return;
    setObjekts(next);
    setOpen(true);
  }, []);

  return (
    <AddToListContext value={openAddToList}>
      {children}
      <AddToListDialog open={open} onOpenChange={setOpen} objekts={objekts} address={address} />
    </AddToListContext>
  );
}

export function useOpenAddToList(): (objekts: ValidObjekt[]) => void {
  const open = use(AddToListContext);
  if (!open) throw new Error("useOpenAddToList must be used within AddToListProvider");
  return open;
}

/** A bound list only takes objekts that profile owns; every other list takes collections. */
function toAddInput(list: PublicList, objekts: ValidObjekt[]) {
  return {
    slug: list.slug,
    skipDups: true,
    objekts: list.isProfileBind ? objekts.filter(isObjektOwned).map((o) => o.tokenId) : undefined,
    collectionSlugs: list.isProfileBind ? undefined : objekts.map((o) => o.slug),
  };
}

function AddToListDialog({
  open,
  onOpenChange,
  objekts,
  address,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objekts: ValidObjekt[];
  address?: string;
}) {
  const lists = useUserLists();
  const addToList = useAddObjektsToList();
  const [slug, setSlug] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const available = useMemo(
    () =>
      lists.filter((list) =>
        list.isProfileBind
          ? address !== undefined && list.profileAddress === address.toLowerCase()
          : true,
      ),
    [lists, address],
  );

  const selected = available.find((list) => list.slug === slug);

  const submit = () => {
    if (!selected) return;
    const input = toAddInput(selected, objekts);
    const requested = (input.objekts ?? input.collectionSlugs ?? []).length;

    addToList.mutate(input, {
      onSuccess: (rows) => {
        const skipped = requested - rows.length;
        toastManager.add({
          type: rows.length > 0 ? "success" : "info",
          title:
            rows.length === 1 && rows[0]
              ? m.actions_add_to_list_success_single({ collectionId: rows[0].collectionId })
              : rows.length > 1
                ? m.actions_add_to_list_success_multiple({
                    count: rows.length.toLocaleString(),
                  })
                : m.actions_add_to_list_nothing(),
          description:
            skipped > 0
              ? m.actions_add_to_list_skipped({ count: skipped.toLocaleString() })
              : undefined,
        });
        onOpenChange(false);
      },
    });
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) setSlug(null);
          onOpenChange(next);
        }}
      >
        <DialogPopup className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">{m.list_manage_objekt_add_title()}</DialogTitle>
            <DialogDescription>
              {m.filter_selected_count({ count: objekts.length })}
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
              <div className="flex min-w-0 flex-col gap-1.5">
                <Label htmlFor="add-to-list">{m.list_manage_objekt_list_label()}</Label>
                <Select value={slug} onValueChange={setSlug}>
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
                      <SelectItem key={list.slug} value={list.slug}>
                        <span className="truncate">{list.name}</span>
                        <span className="text-muted-foreground ml-1.5 text-xs">
                          {LIST_TYPE_LABEL[list.listTypeNew]()}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
                <span className="text-muted-foreground text-xs text-pretty">
                  {m.list_manage_objekt_skip_dups_desc()}
                </span>
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
