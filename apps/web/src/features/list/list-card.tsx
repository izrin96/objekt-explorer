import {
  CheckIcon,
  LinkIcon,
  LinkSimpleIcon,
  PencilSimpleIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import type { PublicList } from "@repo/api/schemas/list";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { displayNickname } from "@/lib/address";
import { m } from "@/paraglide/messages";

import { DeleteListDialog } from "./delete-list-dialog";
import { EditListDialog } from "./edit-list-dialog";
import { getListLinkOption } from "./list-link";
import { ListTypeBadge } from "./list-type-badge";
import { ShareListButton } from "./share-list-button";

const chipClass =
  "bg-secondary hover:bg-muted inline-flex items-center gap-1 rounded-full px-2 py-0.5";

export function ListCard({ list }: { list: PublicList }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const linked = list.linkedList;

  return (
    <div className="bg-card flex flex-col gap-2.5 rounded-lg border px-3.5 pt-3.5 pb-3">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="font-display flex flex-wrap items-center gap-2 text-base font-semibold">
          <Link
            {...getListLinkOption(list)}
            className="truncate underline-offset-2 hover:underline"
          >
            {list.name}
          </Link>
          {list.isProfileBind ? (
            <Badge variant="outline" size="sm">
              <CheckIcon weight="bold" aria-hidden />
              {m.profile_header_verified()}
            </Badge>
          ) : null}
          <ListTypeBadge type={list.listTypeNew} />
          {list.listTypeNew === "sale" && list.currency ? (
            <span className="text-muted-foreground font-mono text-xs">({list.currency})</span>
          ) : null}
        </div>

        {/* The chip is "which Cosmo owns this list", so it keys off the address;
            `isProfileBind` only decides whether that profile displays it. */}
        {list.profileAddress || linked ? (
          <div className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs">
            {linked ? (
              <Link {...getListLinkOption(linked)} className={chipClass}>
                <LinkSimpleIcon className="size-3 opacity-60" />
                <span className="truncate">{linked.name}</span>
              </Link>
            ) : null}
            {list.profileAddress ? (
              <Link
                to="/@{$nickname}"
                params={{ nickname: list.profile?.nickname || list.profileAddress.toLowerCase() }}
                className={chipClass}
              >
                <LinkIcon className="size-3 opacity-60" />
                <span className="sr-only">{m.list_profile_chip_aria()}</span>
                <span className="truncate">
                  {displayNickname(list.profileAddress, list.profile?.nickname)}
                </span>
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-1.5">
        <ShareListButton list={list} size="xs" />
        <Button
          variant="outline"
          size="icon-xs"
          aria-label={m.list_card_edit_list()}
          onClick={() => setEditOpen(true)}
        >
          <PencilSimpleIcon />
        </Button>
        <Button
          variant="destructive-outline"
          size="icon-xs"
          aria-label={m.list_card_delete()}
          onClick={() => setDeleteOpen(true)}
        >
          <TrashIcon />
        </Button>
      </div>

      <EditListDialog slug={list.slug} open={editOpen} onOpenChange={setEditOpen} />
      <DeleteListDialog
        slug={list.slug}
        name={list.name}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </div>
  );
}
