import {
  ArrowsLeftRightIcon,
  CheckIcon,
  DotsThreeIcon,
  DownloadSimpleIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  TrashIcon,
  UsersIcon,
} from "@phosphor-icons/react";
import { canBeOnTrade, pickedSides, tradeSideOf } from "@repo/api/schemas/list";
import { fullestFilter } from "@repo/api/schemas/trade";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { PendingStatus } from "@/components/router/pending";
import { SocialBadge } from "@/components/shared/social-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageButton } from "@/features/chat/message-button";
import { CompareDialog } from "@/features/compare/compare-dialog";
import { SkeletonGrid } from "@/features/objekt/skeleton-grid";
import { ProfileLink } from "@/features/profile/profile-hover-card";
import { listMatchCountOptions } from "@/features/trade/queries";
import { displayNickname } from "@/lib/address";
import { m } from "@/paraglide/messages";

import { DeleteListDialog } from "./delete-list-dialog";
import { EditListDialog } from "./edit-list-dialog";
import { ExportListDialog } from "./export-list-dialog";
import { getListLinkOption } from "./list-link";
import { useListTarget } from "./list-provider";
import { ListTypeBadge } from "./list-type-badge";
import { ShareListButton } from "./share-list-button";
import { useListOwned } from "./use-list-owned";

export function ListHeader() {
  const list = useListTarget();
  const isOwner = useListOwned();
  const side = tradeSideOf(list.listTypeNew);
  const canTradeMatch = isOwner && (side === "want" || (side === "have" && list.isProfileBind));
  const [compareOpen, setCompareOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const linked = list.linkedList;
  const self = { id: list.id, listTypeNew: list.listTypeNew, linkedListId: linked?.id ?? null };
  const linkedOnTrade =
    linked && canBeOnTrade(linked.listTypeNew, linked.isProfileBind)
      ? [{ id: linked.id, listTypeNew: linked.listTypeNew, linkedListId: list.id }]
      : [];
  const sides = pickedSides(self, [self, ...linkedOnTrade]);
  const match = fullestFilter({
    have: sides.haveListIds.length > 0,
    want: sides.wantListIds.length > 0,
  });
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
                <CheckIcon weight="bold" aria-hidden />
                {m.profile_header_verified()}
              </Badge>
            ) : null}
            {list.listTypeNew !== "general" ? <ListTypeBadge type={list.listTypeNew} /> : null}
            {list.discoverable && canBeOnTrade(list.listTypeNew, list.isProfileBind) ? (
              <Badge variant="outline" size="sm" render={<Link to="/trade" />}>
                <ArrowsLeftRightIcon aria-hidden />
                {m.list_on_trade()}
              </Badge>
            ) : null}
            {list.listTypeNew === "sale" && list.currency ? (
              <span className="text-muted-foreground font-mono text-xs">({list.currency})</span>
            ) : null}
          </div>

          {/* which Cosmo owns the list: the address, never `isProfileBind` */}
          {list.profileAddress ? (
            <ProfileLink
              address={list.profileAddress}
              nickname={list.profile?.nickname || null}
              className="text-muted-foreground hover:text-foreground max-w-full self-start truncate text-sm font-medium underline-offset-2 transition-colors hover:underline"
            >
              {displayNickname(list.profileAddress, list.profile?.nickname)}
            </ProfileLink>
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
          {canTradeMatch ? <TradeMatchesLink slug={list.slug} match={match} /> : null}
          {list.messageable && !isOwner ? (
            <MessageButton target={{ kind: "list", slug: list.slug }} />
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

/** The count is the partners For you shows for this list in `match`, its fullest view. */
function TradeMatchesLink({
  slug,
  match,
}: {
  slug: string;
  match: ReturnType<typeof fullestFilter>;
}) {
  const { data: count } = useQuery(listMatchCountOptions(slug));

  return (
    <Button
      variant="outline"
      size="sm"
      aria-label={count === undefined ? undefined : m.trade_matches_link_label({ count })}
      render={<Link to="/trade/for-you" search={{ list: slug, match }} />}
    >
      <UsersIcon />
      {m.nav_trade_matches()}
      {count === undefined ? null : (
        <Badge variant="secondary" size="sm" className="font-mono tabular-nums">
          {count}
        </Badge>
      )}
    </Button>
  );
}

/** A list page while it loads: the header's shape over the objekt grid. */
export function ListPageSkeleton() {
  return (
    <>
      <PendingStatus />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-56 max-w-full" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-6 w-44" />
        </div>
        <div className="flex gap-1.5">
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="size-8 rounded-md" />
        </div>
      </div>
      <Skeleton className="h-9 w-full max-w-xl rounded-lg" />
      <SkeletonGrid />
    </>
  );
}
