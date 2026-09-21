import { useQuery } from "@tanstack/react-query";
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
import { Spinner } from "@/components/ui/spinner";
import { useUserLists, useUserProfiles } from "@/features/user/hooks";
import { type FieldErrors, zodErrors } from "@/lib/form";
import type { client } from "@/lib/orpc";
import { m } from "@/paraglide/messages";

import { useEditList } from "./actions";
import { type ListDraft, ListForm, listDraftSchema, toEditInput } from "./list-form";
import { listFindOptions } from "./queries";

type StoredList = Awaited<ReturnType<typeof client.list.find>>;

export function EditListDialog({
  slug,
  open,
  onOpenChange,
}: {
  slug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data, error } = useQuery(listFindOptions(slug, open));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-md">
        {data ? (
          // mounted with the stored list in hand, so the draft is its initial state
          <EditListForm list={data} onDone={() => onOpenChange(false)} />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-display">{m.list_edit_title()}</DialogTitle>
              <DialogDescription>{m.list_edit_description()}</DialogDescription>
            </DialogHeader>
            <DialogPanel>
              {error ? (
                <p className="text-destructive-foreground text-sm">{error.message}</p>
              ) : (
                <div className="flex justify-center py-6">
                  <Spinner className="size-5" />
                </div>
              )}
            </DialogPanel>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                {m.common_modal_cancel()}
              </DialogClose>
            </DialogFooter>
          </>
        )}
      </DialogPopup>
    </Dialog>
  );
}

function toDraft(list: StoredList): ListDraft {
  return {
    name: list.name,
    description: list.description ?? "",
    listTypeNew: list.listTypeNew,
    currency: list.currency ?? "",
    linkedListId: list.linkedListId,
    profileAddress: list.profileAddress,
    isProfileBind: list.isProfileBind,
    discoverable: list.discoverable ?? false,
    gridColumns: list.gridColumns,
    hideSerial: list.hideSerial,
    hideUser: list.hideUser,
  };
}

function EditListForm({ list, onDone }: { list: StoredList; onDone: () => void }) {
  const lists = useUserLists();
  const profiles = useUserProfiles();
  const edit = useEditList();
  const [draft, setDraft] = useState<ListDraft>(() => toDraft(list));
  const [errors, setErrors] = useState<FieldErrors>({});

  return (
    <Form
      className="contents"
      errors={errors}
      onFormSubmit={() => {
        const next = zodErrors(listDraftSchema(), draft);
        setErrors(next);
        if (Object.keys(next).length > 0) return;
        edit.mutate(toEditInput(list.slug, draft), { onSuccess: onDone });
      }}
    >
      <DialogHeader>
        <DialogTitle className="font-display">{m.list_edit_title()}</DialogTitle>
        <DialogDescription>{m.list_edit_description()}</DialogDescription>
      </DialogHeader>
      <DialogPanel>
        <ListForm
          idPrefix="edit-list"
          mode="edit"
          value={draft}
          onChange={setDraft}
          lists={lists.filter((entry) => entry.slug !== list.slug)}
          profiles={profiles}
        />
      </DialogPanel>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>{m.common_modal_cancel()}</DialogClose>
        <Button type="submit" loading={edit.isPending}>
          {m.common_actions_save()}
        </Button>
      </DialogFooter>
    </Form>
  );
}
