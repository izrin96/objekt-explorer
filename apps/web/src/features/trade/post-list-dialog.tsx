import { CardsThreeIcon } from "@phosphor-icons/react";
import type { PublicList } from "@repo/api/schemas/list";
import { Link } from "@tanstack/react-router";
import { useRef } from "react";

import { EmptyState } from "@/components/shared/empty-state";
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
import { Switch } from "@/components/ui/switch";
import { useUserLists } from "@/features/user/hooks";
import { m } from "@/paraglide/messages";

import { useSetShowOnTrade } from "./actions";
import { ListRoleBadge } from "./list-role-badge";

/** Each switch saves on its own, so the dismiss button only closes. */
export function PostListDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const lists = useUserLists().filter((list) => list.listTypeNew !== "general");
  // not the first switch: one stray Space on open would post a list
  const closeRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-md" initialFocus={closeRef}>
        <DialogHeader>
          <DialogTitle className="font-display">{m.trade_post_a_list()}</DialogTitle>
          <DialogDescription>{m.trade_post_dialog_description()}</DialogDescription>
        </DialogHeader>
        <DialogPanel>
          {lists.length === 0 ? (
            <EmptyState
              icon={CardsThreeIcon}
              bordered={false}
              title={m.trade_post_dialog_empty()}
              action={
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link to="/list" />}
                  onClick={() => onOpenChange(false)}
                >
                  {m.nav_create_list()}
                </Button>
              }
            />
          ) : (
            <ul className="flex flex-col divide-y">
              {lists.map((list) => (
                <PostListRow key={list.id} list={list} />
              ))}
            </ul>
          )}
        </DialogPanel>
        <DialogFooter>
          <DialogClose ref={closeRef} render={<Button variant="outline" />}>
            {m.common_modal_close()}
          </DialogClose>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

function PostListRow({ list }: { list: PublicList }) {
  const set = useSetShowOnTrade();
  // a have or sale list is discoverable only when filed under a Cosmo profile
  const needsProfile = list.listTypeNew !== "want" && !list.isProfileBind;
  const checked = set.isPending ? set.variables.on : (list.showOnTrade ?? false);
  const id = `post-list-${list.id}`;

  return (
    <li className="flex min-w-0 items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <span className="flex min-w-0 flex-col gap-1">
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <Label htmlFor={id} className="min-w-0 text-sm font-medium break-words">
            {list.name}
          </Label>
          <ListRoleBadge type={list.listTypeNew} />
        </span>
        {needsProfile ? (
          <span id={`${id}-reason`} className="text-muted-foreground text-xs text-pretty">
            {m.trade_post_needs_profile()}
          </span>
        ) : list.listTypeNew === "sale" ? (
          <span id={`${id}-reason`} className="text-muted-foreground text-xs text-pretty">
            {m.trade_post_sale_hint()}
          </span>
        ) : null}
      </span>
      <Switch
        id={id}
        className="mt-0.5 shrink-0"
        aria-describedby={needsProfile || list.listTypeNew === "sale" ? `${id}-reason` : undefined}
        checked={checked}
        disabled={(needsProfile && !checked) || set.isPending}
        onCheckedChange={(on) => set.mutate({ slug: list.slug, on })}
      />
    </li>
  );
}
