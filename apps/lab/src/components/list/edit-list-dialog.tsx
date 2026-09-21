import { type ReactElement, useState } from "react";

import { isListValid, ListForm, normalizeList } from "@/components/list/list-form";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { toastManager } from "@/components/ui/toast";
import { type LabList, type NewList, useLists } from "@/store/lists";

/** every field `ListForm` collects, pre-filled from the stored list */
function draftOf(list: LabList): NewList {
  return {
    name: list.name,
    type: list.type,
    currency: list.currency,
    description: list.description,
    linkedListId: list.linkedListId,
    profileNickname: list.profileNickname,
    isProfileBind: list.isProfileBind,
    isPublic: list.isPublic,
  };
}

/**
 * Port of `list/modal/edit-list-modal.tsx`. Shares `ListForm` with
 * `CreateListDialog`, so both carry the same fields and validation.
 */
export function EditListDialog({ list, children }: { list: LabList; children: ReactElement }) {
  const update = useLists((s) => s.update);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<NewList>(() => draftOf(list));
  const [showErrors, setShowErrors] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setDraft(draftOf(list));
          setShowErrors(false);
        }
        setOpen(next);
      }}
    >
      <DialogTrigger render={children} />
      <DialogPopup className="max-w-md">
        <form
          className="contents"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const next = normalizeList(draft);
            if (!isListValid(next)) {
              setShowErrors(true);
              return;
            }
            update(list.id, next);
            setOpen(false);
            toastManager.add({ type: "success", title: "List updated", description: next.name });
          }}
        >
          <DialogHeader>
            <DialogTitle className="font-display">Edit list</DialogTitle>
            <DialogDescription>
              Manage <span className="text-foreground">{list.name}</span>.
            </DialogDescription>
          </DialogHeader>
          <DialogPanel>
            <ListForm
              idPrefix="el"
              value={draft}
              onChange={setDraft}
              showErrors={showErrors}
              excludeListId={list.id}
            />
          </DialogPanel>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  );
}
