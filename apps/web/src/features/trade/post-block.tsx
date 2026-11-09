import {
  ArrowFatLineDownIcon,
  ArrowSquareOutIcon,
  ChatCircleIcon,
  DotsThreeIcon,
  FlagIcon,
  HandshakeIcon,
  PencilSimpleIcon,
  SquaresFourIcon,
} from "@phosphor-icons/react";
import { startForPost } from "@repo/api/schemas/trade-post";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { Link } from "@tanstack/react-router";
import { type ReactNode, type RefObject, use, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { Button } from "@/components/ui/button";
import { FramePanel } from "@/components/ui/frame";
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { useStartConversation } from "@/features/chat/message-button";
import { TagBadges } from "@/features/list/tag-label";
import { useSafetyDialogs } from "@/features/moderation/safety-dialogs";
import { useOpenOffer } from "@/features/offers/make-offer-button";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { useCopyTradeLink, useTakeDownPost } from "./actions";
import type { Surface } from "./browse-search";
import { useOpenComposer } from "./composer/use-open-composer";
import { CopyLinkItem, ReasonItem } from "./copy-link-item";
import type { ObjektAsk, OpenObjekt } from "./near";
import { anchorOf } from "./person-page";
import { listCount, matchedListIds } from "./person-row";
import { usePlanLists } from "./post-plan";
import { EmptySide, isEmptySide, SideAllDialog, SideNotes, SideStrip } from "./post-side";
import type { PersonPostData, PostSideData } from "./post-types";
import { SideCompareContext } from "./side-items-sheet";
import { NoProfileOffer, type TradeContact } from "./trade-actions";
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
  signedIn,
  ownerId,
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
  /** Report this post… needs an account */
  signedIn: boolean;
  /** the poster's user id, whom Report this post… reports */
  ownerId: string;
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
  const conversation = useStartConversation();
  const menuRef = useRef<HTMLButtonElement>(null);
  // one "+N" dialog per strip, shared with Show all; each mounts on its first open only, since a
  // feed holds many strips and most are never opened
  const [allOpen, setAllOpen] = useState<number | null>(null);
  const [mounted, setMounted] = useState<ReadonlySet<number>>(new Set());
  const [fromMenu, setFromMenu] = useState(false);
  // each Report this post… mounts a fresh report, which opens itself; none until the first
  const [reportRequest, setReportRequest] = useState(0);
  const showAll = (listId: number, viaMenu: boolean) => {
    // committed closed first: Base UI skips the enter animation of a sheet that mounts open
    if (!mounted.has(listId))
      flushSync(() => setMounted((current) => new Set(current).add(listId)));
    setFromMenu(viaMenu);
    setAllOpen(listId);
  };
  const offersHere = contact.kind === "open" && !!anchor && offerHandle !== null;
  // with no linked Cosmo profile there is no offer page, so Make offer says why instead
  const noProfileOffer = contact.kind === "open" && !!anchor && offerHandle === null;
  /** Message about this post: its own card, carrying the match only when one of its strips counts one */
  const messageAbout = () => {
    if (contact.kind !== "open" || !anchor) return;
    const withMatch = strips.some((side) => listCount(post, side) > 0);
    conversation.start(
      { kind: "list", slug: anchor.list.slug },
      { kind: "post", listSlug: anchor.list.slug, withMatch },
    );
  };
  // a near match's drawer names the person, and offers it on this post when the row offers one
  const openNear: OpenObjekt = (objekt, near, ask) =>
    onOpen(
      objekt,
      near && {
        ...near,
        person: name,
        makeOffer: offersHere ? () => makeOffer(objekt.slug) : undefined,
      },
      ask,
    );
  /**
   * Per strip: an objekt from a have or sale strip, or its sheet, also offers itself, asking from
   * that strip's list. The sheet forwards only the objekt and its near match, so this adds the ask.
   */
  const openFrom =
    (side: PostSideData): OpenObjekt =>
    (objekt, near) => {
      const ask: ObjektAsk | undefined =
        offersHere && side.role !== "want"
          ? {
              person: name,
              list: side.list.name,
              offer: () =>
                openOffer({
                  handle: offerHandle,
                  to: { list: anchor.list.slug },
                  startList: side.list.slug,
                  ask: { collectionSlug: objekt.slug, objektId: null, serial: null },
                }),
            }
          : undefined;
      openNear(objekt, near, ask);
    };
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

  const linkReason = handle ? null : m.trade_post_copy_link_no_profile();
  // the "+N" sheet's footer offers what the post's menu leads with; each closes the sheet first
  const sheetActions =
    contact.kind === "open" && anchor ? (
      <>
        <Button
          variant="outline"
          onClick={() => {
            setAllOpen(null);
            messageAbout();
          }}
        >
          <ChatCircleIcon />
          {m.trade_post_message()}
        </Button>
        {offersHere ? (
          <Button
            onClick={() => {
              setAllOpen(null);
              makeOffer();
            }}
          >
            <HandshakeIcon />
            {m.trade_post_make_offer()}
          </Button>
        ) : (
          <NoProfileOffer name={name} label={m.trade_post_make_offer()} size="default" />
        )}
      </>
    ) : undefined;
  // Show all, View post and Copy link, which the owner's Edit post and Take off Trade surround
  const postItems = anchor ? (
    <>
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
      {focused ? null : (
        <ReasonItem
          icon={ArrowSquareOutIcon}
          label={m.trade_post_view()}
          reason={linkReason}
          link={
            handle ? (
              <Link
                to="/trade/@{$handle}/$slug"
                params={{ handle, slug: anchor.list.slug }}
                // a post page's loader reads the row against the feed's rate limit
                preload={false}
              />
            ) : undefined
          }
        />
      )}
      <CopyLinkItem
        reason={linkReason}
        onCopy={() => {
          if (handle) void copyLink({ handle, slug: anchor.list.slug });
        }}
      />
      {!own && signedIn ? (
        <>
          <MenuSeparator />
          <MenuItem onClick={() => setReportRequest((n) => n + 1)}>
            <FlagIcon />
            {m.trade_post_report()}
          </MenuItem>
        </>
      ) : null}
    </>
  ) : null;

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
              onOpen={openFrom(side)}
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
            {contact.kind === "open" ? (
              <>
                {offersHere ? (
                  <MenuItem onClick={() => makeOffer()}>
                    <HandshakeIcon />
                    {m.trade_post_make_offer()}
                  </MenuItem>
                ) : noProfileOffer ? (
                  <ReasonItem
                    icon={HandshakeIcon}
                    label={m.trade_post_make_offer()}
                    reason={m.trade_offer_no_profile({ name })}
                  />
                ) : null}
                <MenuItem onClick={messageAbout}>
                  <ChatCircleIcon />
                  {m.trade_post_message()}
                </MenuItem>
                <MenuSeparator />
              </>
            ) : null}
            {own ? <OwnPostItems slug={anchor.list.slug}>{postItems}</OwnPostItems> : postItems}
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
            onOpen={openFrom(side)}
            open={allOpen === side.list.id}
            onOpenChange={(open) => setAllOpen(open ? side.list.id : null)}
            finalFocus={fromMenu ? menuRef : undefined}
            owner={own}
            actions={sheetActions}
          />
        ))}
      {reportRequest > 0 && anchor ? (
        <PostReport
          key={reportRequest}
          userId={ownerId}
          name={name}
          listId={post.id}
          list={anchor.list.name}
          menuRef={menuRef}
        />
      ) : null}
    </FramePanel>
  );
}

/**
 * Report this post…'s dialog, opened as it mounts. A child of its own, mounted from the first
 * click only: the report and block hooks would otherwise run for every post in a feed. The menu
 * item that opened it unmounts with the menu, so focus returns to the menu's button.
 */
function PostReport({
  userId,
  name,
  listId,
  list,
  menuRef,
}: {
  userId: string;
  name: string;
  listId: number;
  list: string;
  menuRef: RefObject<HTMLButtonElement | null>;
}) {
  const { openReport, dialogs } = useSafetyDialogs({
    userId,
    name,
    post: { listId, attachment: m.mod_report_post_attached({ list }) },
    finalFocus: menuRef,
  });
  // once per mount: the parent remounts this for each Report this post…
  useEffect(() => {
    openReport();
  }, []);
  return dialogs;
}

/**
 * The owner's Edit post first and Take off Trade last, around the post's other items. A child of
 * its own, mounted only for the owner's posts with the menu open: the take-off hooks also read the
 * viewer's lists, and a feed holds many posts. Take off's toast and Undo run off the mutation's
 * promise, not `mutate`'s callbacks, so they outlive the closed menu.
 */
function OwnPostItems({ slug, children }: { slug: string; children: ReactNode }) {
  const openComposer = useOpenComposer();
  const planLists = usePlanLists();
  const takeDown = useTakeDownPost();
  return (
    <>
      <MenuItem onClick={() => openComposer(startForPost(planLists, slug))}>
        <PencilSimpleIcon />
        {m.trade_composer_edit_title()}
      </MenuItem>
      <MenuSeparator />
      {children}
      <MenuSeparator />
      <MenuItem onClick={() => void takeDown.takeDown(slug)}>
        <ArrowFatLineDownIcon />
        {m.trade_take_off()}
      </MenuItem>
    </>
  );
}
