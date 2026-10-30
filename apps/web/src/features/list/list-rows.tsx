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
import { OBJEKT_PREVIEW_SIZE } from "@repo/api/constants";
import {
  canBeOnTrade,
  type ListPreview,
  type ListType,
  type PublicList,
} from "@repo/api/schemas/list";
import { Link } from "@tanstack/react-router";
import { type ReactNode, useId, useState } from "react";

import { PendingStatus } from "@/components/router/pending";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ObjektPreviewCount } from "@/features/objekt/objekt-preview-strip";
import { ProfileLink } from "@/features/profile/profile-hover-card";
import { TagBadges } from "@/features/trade/tag-label";
import { displayNickname } from "@/lib/address";
import { TONE_INK } from "@/lib/tone";
import { m } from "@/paraglide/messages";

import { CopyListDialog } from "./copy-list-dialog";
import { DeleteListDialog } from "./delete-list-dialog";
import { EditListDialog } from "./edit-list-dialog";
import { getListLinkOption } from "./list-link";
import { listPostTags } from "./list-post-tags";
import {
  LIST_TYPE_LABEL,
  LIST_TYPE_TONE,
  ListBoundBadge,
  ListCurrencyBadge,
  ListTypeBadge,
} from "./list-type-badge";
import { useCopyListLink } from "./share-list-button";
import { useIsListOwner } from "./use-list-owned";

const chipClass =
  "bg-secondary hover:bg-input relative z-10 inline-flex max-w-full min-w-0 items-center gap-1 rounded-full px-2 py-0.5";

const GROUP_ORDER: ListType[] = ["want", "have", "sale", "general"];

export type GetPreview = (slug: string) => ListPreview | null | undefined;

/** The user's lists as rows, one section per type; a type with no list is left out. */
export function ListRows({ lists, getPreview }: { lists: PublicList[]; getPreview: GetPreview }) {
  return (
    <div className="flex flex-col gap-6">
      {GROUP_ORDER.map((type) => {
        const group = lists.filter((list) => list.listType === type);
        return group.length > 0 ? (
          <ListSection key={type} title={LIST_TYPE_LABEL[type]()} tone={type} count={group.length}>
            <ListRowGroup>
              {group.map((list) => (
                <ListRow key={list.slug} list={list} preview={getPreview(list.slug)} showProfile />
              ))}
            </ListRowGroup>
          </ListSection>
        ) : null;
      })}
    </div>
  );
}

/** A titled run of rows, the title in the colour of the list type it stands for. */
export function ListSection({
  title,
  tone,
  count,
  children,
}: {
  title: string;
  tone: ListType;
  count: number;
  children: ReactNode;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex min-w-0 flex-col gap-2">
      <h2 id={headingId} className="flex items-baseline gap-2 text-sm font-semibold">
        <span className={TONE_INK[LIST_TYPE_TONE[tone]]}>{title}</span>
        <span className="sr-only">: </span>
        <span className="text-muted-foreground font-mono text-xs font-normal tabular-nums">
          {count.toLocaleString()}
        </span>
      </h2>
      {children}
    </section>
  );
}

/** The bordered frame the rows of a section sit in. */
export function ListRowGroup({ children }: { children: ReactNode }) {
  return <ul className="bg-card divide-y overflow-hidden rounded-lg border">{children}</ul>;
}

/** `preview` is undefined while loading and null when it could not be read. */
export function ListRow({
  list,
  preview,
  showProfile,
  showType = false,
}: {
  list: PublicList;
  preview: ListPreview | null | undefined;
  /** off where the page already is that profile */
  showProfile: boolean;
  /** on where the section does not name the list's type */
  showType?: boolean;
}) {
  return (
    <li className="hover:bg-secondary/40 relative flex items-center gap-3 px-3 py-2.5 transition-colors">
      <ThumbStrip preview={preview} />
      <ThumbStack preview={preview} />

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="font-display truncate text-base font-semibold">
          {/* stretched over the row; the controls in it sit above at `z-10` */}
          <Link
            {...getListLinkOption(list)}
            className="focus-visible:after:ring-ring outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-inset"
          >
            {list.name}
          </Link>
        </h3>
        <div className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs">
          {showType ? <ListTypeBadge type={list.listType} /> : null}
          <ObjektPreviewCount preview={preview} />
          {list.isProfileBind ? (
            <span className="relative z-10">
              <ListBoundBadge />
            </span>
          ) : null}
          <ListTradeMark list={list} />
          {list.listType === "sale" && list.currency ? (
            <span className="relative z-10">
              <ListCurrencyBadge currency={list.currency} />
            </span>
          ) : null}
          <ListChips list={list} showProfile={showProfile} />
        </div>
      </div>

      <ListActionsMenu list={list} />
    </li>
  );
}

/** The latest artworks at a fixed size, with dashed slots for the ones the list lacks. */
function ThumbStrip({ preview }: { preview: ListPreview | null | undefined }) {
  return (
    <div className="hidden shrink-0 gap-1 sm:flex" aria-hidden>
      {Array.from({ length: OBJEKT_PREVIEW_SIZE }, (_, i) => {
        if (preview === undefined)
          return <Skeleton key={i} className="aspect-photocard w-9 rounded-sm" />;
        const objekt = preview?.objekts[i];
        return objekt ? (
          <img
            key={i}
            src={objekt.thumbnailImage}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
            className="aspect-photocard bg-secondary w-9 rounded-sm object-cover"
          />
        ) : (
          <div key={i} className="aspect-photocard w-9 rounded-sm border border-dashed" />
        );
      })}
    </div>
  );
}

/** The phone's stand-in for the strip: up to three artworks overlapping, at a fixed width. */
function ThumbStack({ preview }: { preview: ListPreview | null | undefined }) {
  const objekts = preview?.objekts.slice(0, 3) ?? [];
  return (
    <div className="flex w-14 shrink-0 -space-x-3.5 sm:hidden" aria-hidden>
      {preview === undefined ? (
        <Skeleton className="aspect-photocard w-7 rounded-sm" />
      ) : objekts.length === 0 ? (
        <div className="aspect-photocard w-7 rounded-sm border border-dashed" />
      ) : (
        objekts.map((objekt, i) => (
          <img
            key={i}
            src={objekt.thumbnailImage}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
            className="aspect-photocard bg-secondary ring-card w-7 rounded-sm object-cover ring-2"
          />
        ))
      )}
    </div>
  );
}

/** The rows while the page loads; `status` announces the loading, once per page. */
export function ListRowsSkeleton({ status = true }: { status?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      {status ? <PendingStatus /> : null}
      <Skeleton className="h-4 w-16" />
      <div className="bg-card divide-y overflow-hidden rounded-lg border">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5">
            <ThumbStrip preview={undefined} />
            <ThumbStack preview={undefined} />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** The On Trade badge and the tags of the post the list is in; nothing while it is off Trade. */
function ListTradeMark({ list }: { list: PublicList }) {
  if (!list.discoverable || !canBeOnTrade(list.listType, list.isProfileBind)) return null;
  const tags = listPostTags(list);
  return (
    <>
      <Badge variant="outline" size="sm" className="relative z-10" render={<Link to="/trade" />}>
        <ArrowsLeftRightIcon aria-hidden />
        {m.list_on_trade()}
      </Badge>
      {tags.length > 0 ? <TagBadges tags={tags} className="relative z-10" /> : null}
    </>
  );
}

/**
 * The linked list and the Cosmo profile, as chips above a stretched link.
 * `showProfile` is off where the page already is that profile.
 */
function ListChips({ list, showProfile }: { list: PublicList; showProfile: boolean }) {
  const linked = list.linkedList;
  const chipAddress = showProfile ? list.profileAddress : null;
  // The chip is "which Cosmo owns this list", so it keys off the address;
  // `isProfileBind` only decides whether that profile displays it.
  if (!chipAddress && !linked) return null;

  return (
    <div className="text-muted-foreground flex max-w-full min-w-0 flex-wrap items-center gap-1.5 text-xs">
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
          <span className="truncate">{displayNickname(chipAddress, list.profile?.nickname)}</span>
        </ProfileLink>
      ) : null}
    </div>
  );
}

/** Copy link for everyone; edit, copy and delete for the owner. */
function ListActionsMenu({ list }: { list: PublicList }) {
  const [editOpen, setEditOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const owned = useIsListOwner(list.slug);
  const copyLink = useCopyListLink(list);

  return (
    <>
      <Menu>
        <MenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={m.list_row_more_actions({ name: list.name })}
              className="relative z-10 shrink-0"
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
    </>
  );
}
