import { copyMode } from "@repo/api/schemas/list-copy";
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
import { useUserProfiles } from "@/features/user/hooks";
import { type FieldErrors, zodErrors } from "@/lib/form";
import type { client } from "@/lib/orpc";
import { orpc } from "@/lib/orpc";
import { refusalText } from "@/lib/refusal";
import { m } from "@/paraglide/messages";

import { useCopyList } from "./actions";
import { EMPTY_DRAFT, type ListDraft, ListForm, listDraftSchema, toCreateInput } from "./list-form";
import { listFindOptions } from "./queries";

type StoredList = Awaited<ReturnType<typeof client.list.find>>;

export function CopyListDialog({
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
          <CopyListForm key={slug} list={data} onDone={() => onOpenChange(false)} />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-display">{m.list_copy_title()}</DialogTitle>
              <DialogDescription>{m.list_create_list_type_desc()}</DialogDescription>
            </DialogHeader>
            <DialogPanel>
              {error ? (
                <p className="text-destructive-foreground text-sm">{refusalText(error)}</p>
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

/** The source's own choices, but never its partner or its place on Trade. */
function toCopyDraft(list: StoredList): ListDraft {
  return {
    name: m.list_copy_name({ name: list.name }),
    description: list.description ?? "",
    listType: list.listType,
    currency: list.currency ?? "",
    linkedListId: null,
    profileAddress: list.profileAddress,
    isProfileBind: list.isProfileBind,
    matchSale: list.listType === "want" ? list.matchSale : EMPTY_DRAFT.matchSale,
    matchHave: list.listType === "want" ? list.matchHave : EMPTY_DRAFT.matchHave,
    gridColumns: list.gridColumns,
    hideSerial: list.hideSerial,
    regenerateSlug: false,
  };
}

function CopyListForm({ list, onDone }: { list: StoredList; onDone: () => void }) {
  const profiles = useUserProfiles();
  const copy = useCopyList();
  const [draft, setDraft] = useState<ListDraft>(() => toCopyDraft(list));
  const [errors, setErrors] = useState<FieldErrors>({});

  const { listType, isProfileBind, profileAddress } = toCreateInput(draft);
  // only a copy that keeps rows one to one needs no count
  const needsPreview = copyMode(list, { listType, isProfileBind, profileAddress }) !== "rows";
  const { data: preview } = useQuery(
    orpc.list.copyPreview.queryOptions({
      input: { sourceSlug: list.slug, listType, isProfileBind, profileAddress },
      enabled: needsPreview,
      // the source's entries and the profile's holdings change without invalidating this
      staleTime: 0,
    }),
  );

  return (
    <Form
      className="contents"
      errors={errors}
      onFormSubmit={() => {
        const next = zodErrors(listDraftSchema(), draft);
        setErrors(next);
        if (Object.keys(next).length > 0) return;
        copy.mutate({ ...toCreateInput(draft), sourceSlug: list.slug }, { onSuccess: onDone });
      }}
    >
      <DialogHeader>
        <DialogTitle className="font-display">{m.list_copy_title()}</DialogTitle>
        <DialogDescription>{m.list_create_list_type_desc()}</DialogDescription>
      </DialogHeader>
      <DialogPanel>
        <ListForm
          mode="create"
          value={draft}
          onChange={setDraft}
          profiles={profiles}
          notice={
            needsPreview && preview ? (
              <p role="status" className="text-muted-foreground text-xs text-pretty">
                {(preview.unit === "copies"
                  ? m.list_copy_hint_copies
                  : m.list_copy_hint_collections)({
                  carried: preview.carried.toLocaleString(),
                  leftOut: preview.leftOut.toLocaleString(),
                })}
              </p>
            ) : null
          }
        />
      </DialogPanel>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>{m.common_modal_cancel()}</DialogClose>
        <Button type="submit" loading={copy.isPending}>
          {m.common_actions_create()}
        </Button>
      </DialogFooter>
    </Form>
  );
}
