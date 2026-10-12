import { CardsThreeIcon, LockSimpleIcon } from "@phosphor-icons/react";
import { canBeOnTrade, type PublicList } from "@repo/api/schemas/list";
import { Link } from "@tanstack/react-router";
import { useId, useRef, useState } from "react";

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
import { CreateListDialog } from "@/features/list/create-list-dialog";
import { EMPTY_DRAFT } from "@/features/list/list-form";
import { useUserLists, useUserProfiles } from "@/features/user/hooks";
import { m } from "@/paraglide/messages";

import { useSetShowOnTrade } from "./actions";
import { ListRoleBadge } from "./list-role-badge";

const LINK = "h-auto p-0 text-xs font-medium underline underline-offset-2";

/** Each switch saves on its own, so the dismiss button only closes. */
export function PostListDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const lists = useUserLists().filter((list) => list.listTypeNew !== "general");
  const profiles = useUserProfiles();
  const [createOpen, setCreateOpen] = useState(false);
  // not the first switch: one stray Space on open would post a list
  const closeRef = useRef<HTMLButtonElement>(null);
  // names the line that explains why the group is locked
  const unavailableId = useId();
  // an older unbound sale list that's still on can be turned off, so it stays with the rest
  const unavailable = lists.filter(
    (list) => !canBeOnTrade(list.listTypeNew, list.isProfileBind) && !list.discoverable,
  );
  const available = lists.filter((list) => !unavailable.includes(list));
  const profile = profiles[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-md" initialFocus={closeRef}>
        <DialogHeader>
          <DialogTitle className="font-display">{m.trade_post_a_list()}</DialogTitle>
          <DialogDescription>{m.trade_post_dialog_description()}</DialogDescription>
        </DialogHeader>
        <DialogPanel className="flex flex-col gap-6">
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
          ) : null}
          {available.length > 0 ? (
            <ul className="flex flex-col divide-y">
              {available.map((list) => (
                <PostListRow key={list.id} list={list} />
              ))}
            </ul>
          ) : null}
          {unavailable.length > 0 ? (
            <section
              aria-labelledby={`${unavailableId}-title`}
              aria-describedby={unavailableId}
              className="flex flex-col gap-3 border-t pt-4"
            >
              <div className="flex flex-col gap-1">
                <h3
                  id={`${unavailableId}-title`}
                  className="text-muted-foreground font-mono text-xs uppercase"
                >
                  {m.trade_post_unavailable_title()}
                </h3>
                <p className="text-muted-foreground text-xs text-pretty">
                  <span id={unavailableId}>
                    {profile ? m.trade_post_unavailable_bind() : m.trade_post_unavailable_link()}
                  </span>{" "}
                  {profile ? (
                    <Button variant="link" className={LINK} onClick={() => setCreateOpen(true)}>
                      {m.trade_post_create_bound()}
                    </Button>
                  ) : (
                    <Button
                      variant="link"
                      className={LINK}
                      render={<Link to="/link/connect" />}
                      onClick={() => onOpenChange(false)}
                    >
                      {m.link_link_cosmo()}
                    </Button>
                  )}
                </p>
              </div>
              <ul className="flex flex-col gap-2">
                {unavailable.map((list) => (
                  <LockedRow key={list.id} list={list} />
                ))}
              </ul>
            </section>
          ) : null}
        </DialogPanel>
        <DialogFooter>
          <DialogClose ref={closeRef} render={<Button variant="outline" />}>
            {m.common_modal_close()}
          </DialogClose>
        </DialogFooter>
        {profile ? (
          <CreateListDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            initial={{
              ...EMPTY_DRAFT,
              // the type of the first locked list, so a sale list gets a sale draft
              listTypeNew: unavailable[0]?.listTypeNew === "sale" ? "sale" : "have",
              profileAddress: profile.address,
              isProfileBind: true,
            }}
          />
        ) : null}
      </DialogPopup>
    </Dialog>
  );
}

function PostListRow({ list }: { list: PublicList }) {
  const set = useSetShowOnTrade();
  const needsProfile = !canBeOnTrade(list.listTypeNew, list.isProfileBind);
  const checked = set.isPending ? set.variables.on : (list.discoverable ?? false);
  const id = `post-list-${list.id}`;
  const reason = needsProfile
    ? m.trade_post_needs_profile()
    : list.listTypeNew === "sale"
      ? m.trade_post_sale_hint()
      : null;

  return (
    <li className="flex min-w-0 items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <span className="flex min-w-0 flex-col gap-1">
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <Label htmlFor={id} className="min-w-0 text-sm font-medium break-words">
            {list.name}
          </Label>
          <ListRoleBadge type={list.listTypeNew} />
        </span>
        {reason ? (
          <span id={`${id}-reason`} className="text-muted-foreground text-xs text-pretty">
            {reason}
          </span>
        ) : null}
      </span>
      <Switch
        id={id}
        className="mt-0.5 shrink-0"
        aria-describedby={reason ? `${id}-reason` : undefined}
        checked={checked}
        // an older unbound sale list can still be on Market, so it can always be turned off
        disabled={(needsProfile && !checked) || set.isPending}
        onCheckedChange={(on) => set.mutate({ slug: list.slug, on })}
      />
    </li>
  );
}

/** A list that can't go on Trade: no switch to try, so it can't pass for one that's off. */
function LockedRow({ list }: { list: PublicList }) {
  return (
    <li className="text-muted-foreground flex min-w-0 items-center justify-between gap-3">
      <span className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="min-w-0 text-sm break-words">{list.name}</span>
        <ListRoleBadge type={list.listTypeNew} />
      </span>
      <LockSimpleIcon aria-hidden className="size-4 shrink-0" />
    </li>
  );
}
