import { useQuery } from "@tanstack/react-query";
import { type RefObject, useId, useState } from "react";

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
import { Spinner } from "@/components/ui/spinner";
import { CopyListForm } from "@/features/list/copy-list-dialog";
import { ListLabel } from "@/features/list/list-option";
import { listFindOptions } from "@/features/list/queries";
import { useUserLists } from "@/features/user/hooks";
import { refusalText } from "@/lib/refusal";
import { m } from "@/paraglide/messages";

import type { Slot } from "../post-kind-text";

/** Copy a list… on one side: any of the viewer's lists, copied as the side's type and picked. */
export function ComposerCopyDialog({
  slot,
  open,
  onOpenChange,
  onCreated,
  finalFocus,
}: {
  slot: Slot;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (slug: string) => void;
  /** opened from code, not a trigger, so the caller says where focus goes back to */
  finalFocus?: RefObject<HTMLElement | null>;
}) {
  const id = useId();
  const lists = useUserLists();
  const [slug, setSlug] = useState<string | null>(null);
  const { data: source, error } = useQuery(listFindOptions(slug ?? "", open && slug !== null));

  const change = (next: boolean) => {
    if (!next) setSlug(null);
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogPopup className="max-w-md" finalFocus={finalFocus}>
        <DialogHeader>
          <DialogTitle className="font-display">{m.list_copy_title()}</DialogTitle>
          <DialogDescription>{m.list_create_picked_desc()}</DialogDescription>
          {/* outside the keyed form, so a new pick refills the form and keeps focus here */}
          <div className="mt-2 flex min-w-0 flex-col gap-1.5">
            <Label htmlFor={id}>{m.trade_composer_copy_from()}</Label>
            <Select value={slug} onValueChange={(next: string | null) => setSlug(next)}>
              <SelectTrigger id={id} className="min-w-0">
                <SelectValue>
                  {(next: string | null) => {
                    const list = lists.find((item) => item.slug === next);
                    return list ? (
                      <ListLabel name={list.name} type={list.listType} />
                    ) : (
                      m.list_manage_objekt_list_placeholder()
                    );
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectPopup>
                {lists.map((list) => (
                  <SelectItem key={list.slug} value={list.slug} label={list.name}>
                    <ListLabel name={list.name} type={list.listType} />
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          </div>
        </DialogHeader>
        {slug !== null && source ? (
          <CopyListForm
            key={slug}
            list={source}
            fixedType={slot}
            onCreated={onCreated}
            onDone={() => change(false)}
          />
        ) : (
          <>
            {slug !== null ? (
              <DialogPanel>
                {error ? (
                  <p className="text-destructive-foreground text-sm">{refusalText(error)}</p>
                ) : (
                  <div className="flex justify-center py-6">
                    <Spinner className="size-5" />
                  </div>
                )}
              </DialogPanel>
            ) : null}
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                {m.common_modal_cancel()}
              </DialogClose>
              <Button disabled>{m.common_actions_create()}</Button>
            </DialogFooter>
          </>
        )}
      </DialogPopup>
    </Dialog>
  );
}
