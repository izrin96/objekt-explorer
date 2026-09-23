import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

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
} from "@/components/ui/dialog";
import { toastManager } from "@/components/ui/toast";
import { EMPTY_LIST, type NewList, useLists } from "@/store/lists";

/**
 * Port of `list/modal/create-list-modal.tsx`. The fields live in `ListForm`,
 * shared with `EditListDialog`, so the two dialogs cannot drift apart.
 *
 * On save it lands on the new list's page, like the app's create modal.
 *
 * Controlled like `AddToListDialog`: one of its two callers is a menu item,
 * and the menu unmounts its popup on click, taking any trigger with it.
 */
export function CreateListDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const create = useLists((s) => s.create);
  const navigate = useNavigate();
  const [draft, setDraft] = useState<NewList>(EMPTY_LIST);
  const [showErrors, setShowErrors] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // reset on close as well as open: the dialog keeps its state while the
        // toast is still animating out otherwise
        if (!next) {
          setDraft(EMPTY_LIST);
          setShowErrors(false);
        }
        onOpenChange(next);
      }}
    >
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
            const id = create(next);
            onOpenChange(false);
            toastManager.add({ type: "success", title: "List created", description: next.name });
            void navigate({ to: "/list/$slug", params: { slug: id } });
          }}
        >
          <DialogHeader>
            <DialogTitle className="font-display">Create list</DialogTitle>
            <DialogDescription>
              Lists group objekts you have, want or are selling.
            </DialogDescription>
          </DialogHeader>
          <DialogPanel>
            <ListForm idPrefix="cl" value={draft} onChange={setDraft} showErrors={showErrors} />
          </DialogPanel>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button type="submit">Create</Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  );
}
