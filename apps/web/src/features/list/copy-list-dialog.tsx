import type { ListType } from "@repo/api/schemas/list";
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
import { getLocale } from "@/paraglide/runtime";

import { useCopyList } from "./actions";
import { toCopyDraft } from "./copy-draft";
import { type ListDraft, ListForm, listDraftSchema, toCreateInput } from "./list-form";
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
        <DialogHeader>
          <DialogTitle className="font-display">{m.list_copy_title()}</DialogTitle>
          <DialogDescription>{m.list_create_list_type_desc()}</DialogDescription>
        </DialogHeader>
        {data ? (
          // mounted with the stored list in hand, so the draft is its initial state
          <CopyListForm key={slug} list={data} onDone={() => onOpenChange(false)} />
        ) : (
          <>
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
                {m.common_modal_close()}
              </DialogClose>
            </DialogFooter>
          </>
        )}
      </DialogPopup>
    </Dialog>
  );
}

export function CopyListForm({
  list,
  onDone,
  fixedType,
  onCreated,
}: {
  list: StoredList;
  onDone: () => void;
  /** the copy's type, not changeable; a have or sale copy is also bound to a profile */
  fixedType?: ListType;
  /** hands the copy back in place of opening it */
  onCreated?: (slug: string) => void;
}) {
  const profiles = useUserProfiles();
  const copy = useCopyList({ opensCopy: onCreated === undefined });
  const [draft, setDraft] = useState<ListDraft>(() => toCopyDraft(list, { fixedType, profiles }));
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
        // per call, so a dialog closed while the copy is in flight picks nothing
        copy.mutate(
          { ...toCreateInput(draft), sourceSlug: list.slug },
          {
            onSuccess: ({ slug }) => {
              onCreated?.(slug);
              onDone();
            },
          },
        );
      }}
    >
      <DialogPanel>
        <ListForm
          mode="create"
          value={draft}
          onChange={setDraft}
          profiles={profiles}
          lockBind={fixedType !== undefined}
          notice={
            // mounted empty so the text, once it arrives, is announced
            <p role="status" className="text-muted-foreground text-xs text-pretty empty:sr-only">
              {needsPreview && preview
                ? (preview.unit === "copies"
                    ? m.list_copy_hint_copies
                    : m.list_copy_hint_collections)({
                    carried: preview.carried.toLocaleString(getLocale()),
                    leftOut: preview.leftOut.toLocaleString(getLocale()),
                  })
                : null}
            </p>
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
