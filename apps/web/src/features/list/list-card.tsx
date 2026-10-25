import {
  ArrowsLeftRightIcon,
  CopyIcon,
  DotsThreeIcon,
  LinkIcon,
  LinkSimpleIcon,
  PencilSimpleIcon,
  ShareNetworkIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { canBeOnTrade, type ListPreview, type PublicList } from "@repo/api/schemas/list";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import {
  ObjektPreviewCount,
  ObjektPreviewStrip,
  previewCardClass,
  previewCardLinkClass,
} from "@/features/objekt/objekt-preview-strip";
import { ProfileLink } from "@/features/profile/profile-hover-card";
import { TagBadges } from "@/features/trade/tag-label";
import { displayNickname } from "@/lib/address";
import { m } from "@/paraglide/messages";

import { CopyListDialog } from "./copy-list-dialog";
import { DeleteListDialog } from "./delete-list-dialog";
import { EditListDialog } from "./edit-list-dialog";
import { getListLinkOption } from "./list-link";
import { listPostTags } from "./list-post-tags";
import { ListBoundBadge, ListCurrencyBadge, ListTypeBadge } from "./list-type-badge";
import { useCopyListLink } from "./share-list-button";
import { useIsListOwner } from "./use-list-owned";

const chipClass =
  "bg-secondary hover:bg-input relative z-10 inline-flex items-center gap-1 rounded-full px-2 py-0.5";

/**
 * `preview` is undefined while loading and null when it could not be read.
 * `showProfile` is off where the page already is that profile.
 */
export function ListCard({
  list,
  preview,
  showProfile = true,
}: {
  list: PublicList;
  preview: ListPreview | null | undefined;
  showProfile?: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const owned = useIsListOwner(list.slug);
  const copyLink = useCopyListLink(list);
  const linked = list.linkedList;
  const chipAddress = showProfile ? list.profileAddress : null;
  const tags = listPostTags(list);

  return (
    <div className={previewCardClass}>
      <ObjektPreviewStrip preview={preview} />

      <div className="flex items-start gap-2 px-3.5 pt-3 pb-3.5">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h2 className="font-display truncate text-base font-semibold">
            <Link {...getListLinkOption(list)} className={previewCardLinkClass}>
              {list.name}
            </Link>
          </h2>

          <div className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs">
            <ListTypeBadge type={list.listType} />
            {list.isProfileBind ? <ListBoundBadge /> : null}
            {list.discoverable && canBeOnTrade(list.listType, list.isProfileBind) ? (
              <Badge
                variant="outline"
                size="sm"
                className="relative z-10"
                render={<Link to="/trade" />}
              >
                <ArrowsLeftRightIcon aria-hidden />
                {m.list_on_trade()}
              </Badge>
            ) : null}
            {tags.length > 0 ? <TagBadges tags={tags} /> : null}
            {list.listType === "sale" && list.currency ? (
              <ListCurrencyBadge currency={list.currency} />
            ) : null}
            <ObjektPreviewCount preview={preview} />
          </div>

          {/* The chip is "which Cosmo owns this list", so it keys off the address;
              `isProfileBind` only decides whether that profile displays it. */}
          {chipAddress || linked ? (
            <div className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs">
              {linked ? (
                <Link {...getListLinkOption(linked)} className={chipClass}>
                  <LinkSimpleIcon className="size-3 opacity-60" />
                  <span className="truncate">{linked.name}</span>
                </Link>
              ) : null}
              {chipAddress ? (
                <ProfileLink
                  address={chipAddress}
                  nickname={list.profile?.nickname || null}
                  className={chipClass}
                >
                  <LinkIcon className="size-3 opacity-60" />
                  <span className="sr-only">{m.list_profile_chip_aria()}</span>
                  <span className="truncate">
                    {displayNickname(chipAddress, list.profile?.nickname)}
                  </span>
                </ProfileLink>
              ) : null}
            </div>
          ) : null}
        </div>

        <Menu>
          <MenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={m.list_more_actions()}
                className="relative z-10 -me-1.5 -mt-0.5 shrink-0"
              />
            }
          >
            <DotsThreeIcon weight="bold" />
          </MenuTrigger>
          <MenuPopup align="end" className="min-w-40">
            <MenuItem onClick={() => void copyLink()}>
              <ShareNetworkIcon />
              {m.list_copy_link()}
            </MenuItem>
            {owned ? (
              <>
                <MenuItem onClick={() => setEditOpen(true)}>
                  <PencilSimpleIcon />
                  {m.list_card_edit()}
                </MenuItem>
                <MenuItem onClick={() => setCopyOpen(true)}>
                  <CopyIcon />
                  {m.list_copy_action()}
                </MenuItem>
                <MenuSeparator />
                <MenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                  <TrashIcon />
                  {m.list_card_delete()}
                </MenuItem>
              </>
            ) : null}
          </MenuPopup>
        </Menu>
      </div>

      {owned ? (
        <>
          <EditListDialog slug={list.slug} open={editOpen} onOpenChange={setEditOpen} />
          <CopyListDialog slug={list.slug} open={copyOpen} onOpenChange={setCopyOpen} />
          <DeleteListDialog
            slug={list.slug}
            name={list.name}
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
          />
        </>
      ) : null}
    </div>
  );
}
