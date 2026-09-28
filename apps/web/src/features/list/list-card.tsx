import {
  CheckIcon,
  DotsThreeIcon,
  LinkIcon,
  LinkSimpleIcon,
  PencilSimpleIcon,
  ShareNetworkIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { LIST_PREVIEW_SIZE } from "@repo/api/schemas/list";
import type { ListPreview, PublicList } from "@repo/api/schemas/list";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { Shimmer } from "@/components/shared/shimmer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { displayNickname } from "@/lib/address";
import { m } from "@/paraglide/messages";

import { DeleteListDialog } from "./delete-list-dialog";
import { EditListDialog } from "./edit-list-dialog";
import { getListLinkOption } from "./list-link";
import { ListTypeBadge } from "./list-type-badge";
import { useCopyListLink } from "./share-list-button";

const chipClass =
  "bg-secondary hover:bg-muted relative z-10 inline-flex items-center gap-1 rounded-full px-2 py-0.5";

/** `preview` is undefined while loading and null when it could not be read. */
export function ListCard({
  list,
  preview,
}: {
  list: PublicList;
  preview: ListPreview | null | undefined;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const copyLink = useCopyListLink(list);
  const linked = list.linkedList;

  return (
    <div className="group/list bg-card hover:border-foreground/20 relative flex flex-col overflow-hidden rounded-lg border transition-colors">
      <ListPreviewStrip preview={preview} />

      <div className="flex items-start gap-2 px-3.5 pt-3 pb-3.5">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h2 className="font-display truncate text-base font-semibold">
            {/* stretched over the whole card; the chips and menu sit above it */}
            <Link
              {...getListLinkOption(list)}
              className="focus-visible:after:ring-ring outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-inset"
            >
              {list.name}
            </Link>
          </h2>

          <div className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs">
            <ListTypeBadge type={list.listTypeNew} />
            {list.isProfileBind ? (
              <Badge variant="outline" size="sm">
                <CheckIcon weight="bold" aria-hidden />
                {m.profile_header_verified()}
              </Badge>
            ) : null}
            {preview === null ? null : preview ? (
              <span className="font-mono tabular-nums">
                {preview.count === 0
                  ? m.list_card_empty()
                  : preview.count === 1
                    ? m.list_card_count_single()
                    : m.list_card_count_multiple({ count: preview.count.toLocaleString() })}
              </span>
            ) : (
              <Shimmer className="h-3 w-16" />
            )}
            {list.listTypeNew === "sale" && list.currency ? (
              <span className="font-mono">· {list.currency}</span>
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
            <MenuItem onClick={() => setEditOpen(true)}>
              <PencilSimpleIcon />
              {m.list_card_edit()}
            </MenuItem>
            <MenuSeparator />
            <MenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
              <TrashIcon />
              {m.list_card_delete()}
            </MenuItem>
          </MenuPopup>
        </Menu>
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

/** The latest few artworks, with dashed slots standing in for the ones a short list lacks. */
function ListPreviewStrip({ preview }: { preview: ListPreview | null | undefined }) {
  return (
    <div className="bg-secondary/40 grid grid-cols-4 gap-1.5 border-b p-2.5" aria-hidden>
      {Array.from({ length: LIST_PREVIEW_SIZE }, (_, i) => {
        const objekt = preview?.objekts[i];
        return (
          <div key={i} className="@container">
            {preview === undefined ? (
              <Shimmer className="aspect-photocard rounded-photocard" />
            ) : objekt ? (
              <div className="rounded-photocard bg-secondary aspect-photocard relative overflow-hidden transition-transform duration-200 ease-out motion-safe:group-hover/list:-translate-y-0.5">
                <img
                  src={objekt.thumbnailImage}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  className="absolute inset-0 size-full object-cover"
                />
              </div>
            ) : (
              <div className="rounded-photocard aspect-photocard border border-dashed" />
            )}
          </div>
        );
      })}
    </div>
  );
}
