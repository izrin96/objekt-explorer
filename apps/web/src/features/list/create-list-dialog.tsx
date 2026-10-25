import { canBeOnTrade } from "@repo/api/schemas/list";
import type { ComposerStart } from "@repo/api/schemas/trade-post";
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
import { NEW_POST, PostComposer, useComposer } from "@/features/trade/post-list-dialog";
import { useUserProfiles } from "@/features/user/hooks";
import { type FieldErrors, zodErrors } from "@/lib/form";
import { m } from "@/paraglide/messages";

import { useCreateList } from "./actions";
import { EMPTY_DRAFT, type ListDraft, ListForm, listDraftSchema, toCreateInput } from "./list-form";

/** Controlled: one of its triggers is a menu item, and the menu takes its popup with it. */
export function CreateListDialog({
  open,
  onOpenChange,
  initial = EMPTY_DRAFT,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The draft it opens with, and goes back to on close. */
  initial?: ListDraft;
}) {
  const profiles = useUserProfiles();
  const create = useCreateList();
  // the profile defaults to the first one, for every list type; none is fine
  const opening: ListDraft = {
    ...initial,
    profileAddress: initial.profileAddress ?? profiles[0]?.address ?? null,
  };
  const [draft, setDraft] = useState<ListDraft>(opening);
  const [errors, setErrors] = useState<FieldErrors>({});
  // a have or want list just made, which the dialog offers to post
  const [created, setCreated] = useState<ComposerStart | null>(null);
  const composer = useComposer();

  const change = (next: boolean) => {
    // reset on close too: the dialog keeps its state while the toast animates out
    if (!next) {
      setDraft(opening);
      setErrors({});
      setCreated(null);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogPopup className="max-w-md">
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-display">{m.list_create_success()}</DialogTitle>
              <DialogDescription>{m.list_created_post_hint()}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                {m.common_modal_close()}
              </DialogClose>
              <Button onClick={() => composer.openWith(created)}>{m.trade_post_it()}</Button>
            </DialogFooter>
            <PostComposer
              {...composer.dialog}
              onOpenChange={(next) => {
                composer.dialog.onOpenChange(next);
                if (!next) change(false);
              }}
            />
          </>
        ) : (
          <Form
            className="contents"
            errors={errors}
            onFormSubmit={() => {
              const next = zodErrors(listDraftSchema(), draft);
              setErrors(next);
              if (Object.keys(next).length > 0) return;
              const input = toCreateInput(draft);
              create.mutate(input, {
                onSuccess: ({ slug }) => {
                  const type = input.listType;
                  if (
                    (type === "have" || type === "want") &&
                    canBeOnTrade(type, input.isProfileBind)
                  ) {
                    setCreated(
                      type === "have"
                        ? { ...NEW_POST, kind: "swap", have: slug }
                        : { ...NEW_POST, want: slug },
                    );
                  } else {
                    change(false);
                  }
                },
              });
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
        )}
      </DialogPopup>
    </Dialog>
  );
}
