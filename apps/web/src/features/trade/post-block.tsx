import { DotsThreeIcon, HandshakeIcon, SquaresFourIcon } from "@phosphor-icons/react";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { use, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { FramePanel } from "@/components/ui/frame";
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { TagBadges } from "@/features/list/tag-label";
import { useOpenOffer } from "@/features/offers/make-offer-button";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { useCopyTradeLink } from "./actions";
import type { Surface } from "./browse-search";
import { CopyLinkItem } from "./copy-link-item";
import type { OpenObjekt } from "./near";
import { anchorOf } from "./person-page";
import { listCount, matchedListIds } from "./person-row";
import { EmptySide, isEmptySide, SideAllDialog, SideNotes, SideStrip } from "./post-side";
import type { PersonPostData } from "./post-types";
import { SideCompareContext } from "./side-items-sheet";
import type { TradeContact } from "./trade-actions";
import { TradeSides } from "./trade-row";

/** The post as its own viewer sees it: no rings, since the viewer's row counts nothing. */
function unringed(post: PersonPostData): PersonPostData {
  return {
    ...post,
    sides: post.sides.map((side) => ({
      ...side,
      items: side.items.map(({ ringed: _ringed, near: _near, ...item }) => item),
      rules: side.rules.map((tile) => ({ ...tile, matched: null, matchedSlugs: [] })),
      near: undefined,
    })),
  };
}

export function PostBlock({
  post,
  surface,
  own,
  contact,
  name,
  handle,
  offerHandle,
  focused,
  collections,
  onOpen,
}: {
  post: PersonPostData;
  surface: Surface;
  own: boolean;
  /** the row's contact: Make offer on this post shows only where the row's Make offer does */
  contact: TradeContact;
  name: string;
  /** the person's handle, for the post page's Copy link; null with no linked Cosmo profile */
  handle: string | null;
  /** the handle Make offer links under (`offerHandleOf`); null with no linked Cosmo profile */
  offerHandle: string | null;
  /** the post a post page names, outlined as the current selection */
  focused: boolean;
  collections: Readonly<Record<string, ValidObjekt | undefined>>;
  onOpen: OpenObjekt;
}) {
  const shown = own ? unringed(post) : post;
  const strips = shown.sides.filter((side) => !isEmptySide(side));
  const tag = <TagBadges tags={post.tags} className="flex-wrap font-sans normal-case" />;
  const anchor = anchorOf(post);
  const copyLink = useCopyTradeLink();
  const offering = post.sides.find((side) => side.role !== "want");
  const compare = use(SideCompareContext);
  const openOffer = useOpenOffer();
  const menuRef = useRef<HTMLButtonElement>(null);
  // one "+N" dialog per strip, shared with Show all; each mounts on its first open only, since a
  // feed holds many strips and most are never opened
  const [allOpen, setAllOpen] = useState<number | null>(null);
  const [mounted, setMounted] = useState<ReadonlySet<number>>(new Set());
  const [fromMenu, setFromMenu] = useState(false);
  const showAll = (listId: number, viaMenu: boolean) => {
    setMounted((current) => new Set(current).add(listId));
    setFromMenu(viaMenu);
    setAllOpen(listId);
  };
  const offersHere = contact.kind === "open" && !!anchor && offerHandle !== null;
  // a near match's drawer names the person, and offers it on this post when the row offers one
  const openNear: OpenObjekt = (objekt, near) =>
    onOpen(
      objekt,
      near && {
        ...near,
        person: name,
        makeOffer: offersHere ? () => makeOffer(objekt.slug) : undefined,
      },
    );
  /** `addNear`: Make offer with it, from a near match's drawer */
  const makeOffer = (addNear?: string) => {
    if (!anchor || offerHandle === null) return;
    // near matches ride on the same read, so a strip with only those still asks for it
    const matched =
      !own &&
      (addNear !== undefined || strips.some((side) => listCount(post, side) > 0 || side.near));
    openOffer({
      handle: offerHandle,
      to: { list: anchor.list.slug },
      startList: offering?.list.slug,
      matches: matched
        ? { list: compare.list, mutual: compare.mutual || undefined, post: anchor.list.slug }
        : undefined,
      near: addNear,
    });
  };

  return (
    <FramePanel
      aria-current={focused || undefined}
      className={cn(
        "grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-x-2 p-3",
        focused && "ring-accent-solid ring-2",
      )}
    >
      <div className="flex min-w-0 flex-col gap-2">
        {focused ? <span className="sr-only">{m.trade_post_linked()}</span> : null}
        {/* the tag leads the first strip's label; a post with no strip keeps it on a line of its own */}
        {strips.length === 0 ? tag : null}
        <TradeSides
          strips={strips.map((side, index) => (
            <SideStrip
              key={side.list.id}
              lead={index === 0 ? tag : undefined}
              side={side}
              count={own ? 0 : listCount(post, side)}
              matchedListIds={own ? [] : matchedListIds(post, side)}
              // rules are on the viewer's want lists, so only a side the viewer wants from has them
              ruleMatches={own || side.role === "want" ? undefined : post.ruleMatches}
              narrowed={post.narrowed}
              collections={collections}
              onOpen={openNear}
              onShowAll={() => showAll(side.list.id, false)}
              owner={own}
            />
          ))}
        />
        {shown.sides.filter(isEmptySide).map((side) => (
          <EmptySide key={side.list.id} side={side} surface={surface} />
        ))}
        <SideNotes sides={shown.sides} />
      </div>
      {anchor ? (
        <Menu>
          <MenuTrigger
            ref={menuRef}
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={m.trade_post_menu({ list: anchor.list.name })}
                className="-me-1 -mt-1 self-start"
              />
            }
          >
            <DotsThreeIcon weight="bold" />
          </MenuTrigger>
          <MenuPopup align="end" className="min-w-44">
            {offersHere ? (
              <>
                <MenuItem onClick={() => makeOffer()}>
                  <HandshakeIcon />
                  {m.trade_post_make_offer()}
                </MenuItem>
                <MenuSeparator />
              </>
            ) : null}
            {strips.length > 0 ? (
              <>
                {strips.map((side) => (
                  <MenuItem key={side.list.id} onClick={() => showAll(side.list.id, true)}>
                    <SquaresFourIcon />
                    {m.trade_post_show_all({ list: side.list.name })}
                  </MenuItem>
                ))}
                <MenuSeparator />
              </>
            ) : null}
            <CopyLinkItem
              reason={handle ? null : m.trade_post_copy_link_no_profile()}
              onCopy={() => {
                if (handle) void copyLink({ handle, slug: anchor.list.slug });
              }}
            />
          </MenuPopup>
        </Menu>
      ) : null}
      {strips
        .filter((side) => mounted.has(side.list.id))
        .map((side) => (
          <SideAllDialog
            key={side.list.id}
            side={side}
            narrowed={post.narrowed}
            collections={collections}
            onOpen={openNear}
            open={allOpen === side.list.id}
            onOpenChange={(open) => setAllOpen(open ? side.list.id : null)}
            finalFocus={fromMenu ? menuRef : undefined}
            owner={own}
          />
        ))}
    </FramePanel>
  );
}
