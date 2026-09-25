import {
  ArrowsLeftRightIcon,
  DotsThreeIcon,
  DownloadSimpleIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  TrashIcon,
  UsersIcon,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { SocialBadge } from "@/components/shared/social-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { CompareDialog } from "@/features/compare/compare-dialog";
import { m } from "@/paraglide/messages";

import { DeleteListDialog } from "./delete-list-dialog";
import { EditListDialog } from "./edit-list-dialog";
import { ExportListDialog } from "./export-list-dialog";
import { getListLinkOption } from "./list-link";
import { useListTarget } from "./list-provider";
import { ListTypeBadge } from "./list-type-badge";
import { ShareListButton } from "./share-list-button";
import { TradeMatchesDialog, useCanTradeMatch } from "./trade-matches";
import { useListOwned } from "./use-list-owned";

export function ListHeader() {
  const list = useListTarget();
  const isOwner = useListOwned();
  const canTradeMatch = useCanTradeMatch();
  const [compareOpen, setCompareOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [tradeOpen, setTradeOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const linked = list.linkedList;
  const swappable = (list.listTypeNew === "have" || list.listTypeNew === "want") && linked;

  return (
    <div className="flex flex-col gap-3.5">
      {/* an `auto` track sizes to max-content, so the actions would otherwise
          starve the title column */}
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
              className="text-muted-foreground hover:text-foreground max-w-full truncate text-sm font-medium underline-offset-2 transition-colors hover:underline"
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
          <Menu>
            <MenuTrigger
              render={
                <Button variant="outline" size="icon-sm" aria-label={m.list_more_actions()} />
              }
            >
              <DotsThreeIcon weight="bold" />
            </MenuTrigger>
            <MenuPopup align="end" className="min-w-44">
              <MenuItem onClick={() => setCompareOpen(true)}>
                <MagnifyingGlassIcon />
                {m.common_actions_compare()}
              </MenuItem>
              <MenuItem onClick={() => setExportOpen(true)}>
                <DownloadSimpleIcon />
                {m.common_actions_export()}
              </MenuItem>
              {canTradeMatch ? (
                <MenuItem onClick={() => setTradeOpen(true)}>
                  <UsersIcon />
                  {m.list_trade_matches_title()}
                </MenuItem>
              ) : null}
              {isOwner ? (
                <>
                  <MenuSeparator />
                  <MenuItem onClick={() => setEditOpen(true)}>
                    <PencilSimpleIcon />
                    {m.list_card_edit()}
                  </MenuItem>
                  <MenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                    <TrashIcon />
                    {m.list_card_delete()}
                  </MenuItem>
                </>
              ) : null}
            </MenuPopup>
          </Menu>
        </div>
      </div>

      {list.description ? (
        // set apart from the app's own copy: the owner wrote it, not the site
        <p className="text-foreground border-s-2 ps-3 text-sm text-pretty whitespace-pre-wrap">
          {list.description}
        </p>
      ) : null}

      <CompareDialog
        sourceName={list.name}
        sourceId={list.slug}
        open={compareOpen}
        onOpenChange={setCompareOpen}
      />
      <ExportListDialog slug={list.slug} open={exportOpen} onOpenChange={setExportOpen} />
      <TradeMatchesDialog open={tradeOpen} onOpenChange={setTradeOpen} />
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
