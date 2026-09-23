import { ArrowsLeftRightIcon, PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { SocialBadge } from "@/components/shared/social-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CompareButton } from "@/features/compare/compare-button";
import { m } from "@/paraglide/messages";

import { DeleteListDialog } from "./delete-list-dialog";
import { EditListDialog } from "./edit-list-dialog";
import { ExportButton } from "./export-button";
import { getListLinkOption } from "./list-link";
import { useListTarget } from "./list-provider";
import { ListTypeBadge } from "./list-type-badge";
import { ShareListButton } from "./share-list-button";
import { TradeMatchesButton } from "./trade-matches";
import { useListOwned } from "./use-list-owned";

export function ListHeader() {
  const list = useListTarget();
  const isOwner = useListOwned();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const linked = list.linkedList;
  const swappable = (list.listTypeNew === "have" || list.listTypeNew === "want") && linked;

  return (
    <div className="flex flex-col gap-3.5">
      {/* the actions' own width would otherwise starve the title column: an
          `auto` track sizes to max-content, and six buttons are wider than the page */}
      <div className="grid gap-4 md:grid-cols-[minmax(16rem,1fr)_auto]">
        <div className="flex min-w-0 flex-col justify-center gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-xl font-semibold tracking-tight text-balance">
              {list.name}
            </h1>
            {list.isProfileBind ? (
              <Badge variant="outline" size="sm">
                {m.profile_header_verified()}
              </Badge>
            ) : null}
            {list.listTypeNew !== "general" ? <ListTypeBadge type={list.listTypeNew} /> : null}
            {list.listTypeNew === "sale" && list.currency ? (
              <span className="text-muted-foreground font-mono text-xs">({list.currency})</span>
            ) : null}
          </div>

          {/* which Cosmo owns the list: the address, never `isProfileBind` */}
          {list.profileAddress ? (
            <Link
              to="/@{$nickname}"
              params={{ nickname: list.profile?.nickname || list.profileAddress.toLowerCase() }}
              className="font-display text-foreground max-w-full truncate text-base font-semibold underline-offset-2 hover:underline"
            >
              {list.profile?.nickname ?? list.profileAddress.toLowerCase()}
            </Link>
          ) : null}

          {list.user ? (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Avatar className="size-6">
                {list.user.image ? <AvatarImage src={list.user.image} alt="" /> : null}
                <AvatarFallback>{(list.user.name ?? "?").slice(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
              {list.user.name ? <SocialBadge platform="cosmo" username={list.user.name} /> : null}
              {list.user.discord ? (
                <SocialBadge platform="discord" username={list.user.discord} />
              ) : null}
              {list.user.twitter ? (
                <SocialBadge platform="twitter" username={list.user.twitter} />
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 md:items-end md:justify-end">
          {swappable ? (
            <Button
              variant="outline"
              size="sm"
              render={<Link {...getListLinkOption(linked)} replace />}
            >
              <ArrowsLeftRightIcon />
              {list.listTypeNew === "have" ? m.list_swap_to_want() : m.list_swap_to_have()}
            </Button>
          ) : null}
          <ShareListButton list={list} />
          <CompareButton sourceName={list.name} sourceId={list.slug} />
          <ExportButton slug={list.slug} />
          <TradeMatchesButton />
          {isOwner ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <PencilSimpleIcon />
                {m.list_card_edit()}
              </Button>
              <Button variant="destructive-outline" size="sm" onClick={() => setDeleteOpen(true)}>
                <TrashIcon />
                {m.list_card_delete()}
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {list.description ? (
        <p className="text-foreground text-sm whitespace-pre-wrap">{list.description}</p>
      ) : null}

      {isOwner ? (
        <>
          <EditListDialog
            slug={list.slug}
            open={editOpen}
            onOpenChange={setEditOpen}
            redirectOnSave
          />
          <DeleteListDialog
            slug={list.slug}
            name={list.name}
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            redirectOnDelete
          />
        </>
      ) : null}
    </div>
  );
}
