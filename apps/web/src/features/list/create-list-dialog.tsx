import { useState } from "react";

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
import { Form } from "@/components/ui/form";
import { useUserLists, useUserProfiles } from "@/features/user/hooks";
import { type FieldErrors, zodErrors } from "@/lib/form";
import { m } from "@/paraglide/messages";

import { useCreateList } from "./actions";
import { EMPTY_DRAFT, type ListDraft, ListForm, listDraftSchema, toCreateInput } from "./list-form";

/** Controlled: one of its triggers is a menu item, and the menu takes its popup with it. */
export function CreateListDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const lists = useUserLists();
  const profiles = useUserProfiles();
  const create = useCreateList();
  const [draft, setDraft] = useState<ListDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<FieldErrors>({});

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // reset on close too: the dialog keeps its state while the toast animates out
        if (!next) {
          setDraft(EMPTY_DRAFT);
          setErrors({});
        }
        onOpenChange(next);
      }}
    >
      <DialogPopup className="max-w-md">
        <Form
          className="contents"
          errors={errors}
          onFormSubmit={() => {
            const next = zodErrors(listDraftSchema(), draft);
            setErrors(next);
            if (Object.keys(next).length > 0) return;
            create.mutate(toCreateInput(draft), { onSuccess: () => onOpenChange(false) });
          }}
        >
          <DialogHeader>
            <DialogTitle className="font-display">{m.list_create_title()}</DialogTitle>
            <DialogDescription>{m.list_create_list_type_desc()}</DialogDescription>
          </DialogHeader>
          <DialogPanel>
            <ListForm
              idPrefix="create-list"
              mode="create"
              value={draft}
              onChange={setDraft}
              lists={lists}
              profiles={profiles}
            />
          </DialogPanel>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              {m.common_modal_cancel()}
            </DialogClose>
            <Button type="submit" loading={create.isPending}>
              {m.common_actions_create()}
            </Button>
          </DialogFooter>
        </Form>
      </DialogPopup>
    </Dialog>
  );
}
