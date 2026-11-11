import type { ValidObjekt } from "@repo/lib/types/objekt";
import { Link } from "@tanstack/react-router";
import { type ReactNode, type RefObject } from "react";

import { MoreCount } from "@/components/shared/more-count";
import { getListLinkOption } from "@/features/list/list-link";
import { LIST_TYPE_LABEL, LIST_TYPE_TONE } from "@/features/list/list-type-labels";
import { ratioSideOf } from "@/features/list/ratio-text";
import { nearCountText } from "@/lib/near-text";
import { formatCount } from "@/lib/number";
import { TONE_INK, toneChip } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { MatchedListsChip } from "./matched-lists";
import { PostStrip, SIDE_LINK } from "./post-side";
import type { PersonPostData } from "./post-types";
import { RuleTiles } from "./rule-tile";
import { SideItemsSheet } from "./side-items-sheet";
import type { SideProps } from "./side-props";
import { TILE } from "./thumb-grid";

const STRIP_MORE =
  "hover:text-foreground focus-visible:ring-ring text-xs outline-none focus-visible:ring-2";

const NO_LIST_IDS: readonly number[] = Object.freeze([]);

/** A person's list: its role and name, its own count, its ringed matches; the label links to the list. */
export function SideStrip({
  lead,
  side,
  count,
  matchedListIds = NO_LIST_IDS,
  ruleMatches,
  narrowed,
  collections,
  onOpen,
  onShowAll,
  owner = false,
}: SideProps & {
  lead?: ReactNode;
  /** the collections of this list that match the viewer: "14 you want", "2 you have" */
  count: number;
  /** the viewer's lists that count was taken against, which the count opens */
  matchedListIds?: readonly number[];
  /** what the count matched only through the viewer's rules, named under their lists */
  ruleMatches?: PersonPostData["ruleMatches"];
  collections: Readonly<Record<string, ValidObjekt | undefined>>;
  /** the "+N" tile opens the side's whole list, in the sheet the post keeps */
  onShowAll: () => void;
}) {
  const { list } = side;
  const role = LIST_TYPE_LABEL[side.role]();
  // a narrowed strip whose label is the count chip, which counts collections
  const inCollections = narrowed && count > 0;
  const total = inCollections ? side.collectionCount : side.copyCount + side.others;
  const near = side.near;
  const ratioSide = ratioSideOf(side.role);
  const text = (
    <>
      <Link
        {...getListLinkOption(list)}
        title={list.name}
        className={cn(SIDE_LINK, "flex w-fit max-w-full min-w-0 items-baseline gap-1.5")}
      >
        {/* the match chip carries the list's number, so a second one would only compete with it */}
        <span className="shrink-0">
          {narrowed && count === 0 ? `${role} ${side.copyCount}` : role}
        </span>
        <span aria-hidden className="text-muted-foreground shrink-0">
          ·
        </span>
        <span className="text-foreground min-w-0 truncate normal-case">{list.name}</span>
      </Link>
      {/* beside the link, not in it: it opens the viewer's lists behind it */}
      {count > 0 ? (
        <MatchedListsChip
          listIds={matchedListIds}
          ruleMatches={ruleMatches}
          near={near}
          className={cn(toneChip("success"), "shrink-0 rounded-sm border px-1.5 normal-case")}
        >
          {side.role === "want"
            ? m.trade_list_count_you_have({ count: formatCount(count) })
            : m.trade_list_count_you_want({ count: formatCount(count) })}
        </MatchedListsChip>
      ) : null}
      {/* never counted: muted, after the count, and the popover's way in when there is none */}
      {near ? (
        count > 0 ? (
          <span className="text-muted-foreground shrink-0 normal-case">
            <span aria-hidden>· </span>
            {nearCountText(near.verb, near.count)}
          </span>
        ) : (
          <MatchedListsChip
            listIds={[]}
            near={near}
            className="text-muted-foreground shrink-0 rounded normal-case"
          >
            {nearCountText(near.verb, near.count)}
          </MatchedListsChip>
        )
      ) : null}
    </>
  );

  return (
    <PostStrip
      lead={lead}
      label={text}
      tone={TONE_INK[LIST_TYPE_TONE[side.role]]}
      items={side.items.map((item) => ({
        key: item.entryId,
        slug: item.slug,
        qty: item.qty,
        ringed: item.ringed,
        near:
          item.near && near
            ? { verb: near.verb, role: side.role, theirList: list.name, myListIds: item.near }
            : undefined,
        ratio: item.ratio,
      }))}
      ratio={ratioSide ? { side: ratioSide, owner } : undefined}
      hidden={side.more}
      copies={
        inCollections
          ? undefined
          : side.copyCount - side.rules.reduce((sum, tile) => sum + tile.count, 0)
      }
      rules={
        side.rules.length > 0 ? (
          <RuleTiles tiles={side.rules} collections={collections} onOpen={onOpen} owner={owner} />
        ) : undefined
      }
      collections={collections}
      onOpen={onOpen}
      // the rest of the list in a sheet, so a phone that fits few tiles can still see them all
      more={(count) => (
        <button
          type="button"
          className={cn(TILE, STRIP_MORE, "w-full cursor-pointer")}
          onClick={onShowAll}
        >
          <MoreCount count={count} />
        </button>
      )}
      othersLink={
        narrowed && total > 0 ? (
          <Link
            {...getListLinkOption(list)}
            className={cn(
              "text-muted-foreground hover:text-foreground text-xs whitespace-nowrap",
              SIDE_LINK,
            )}
          >
            {m.trade_strip_total({ total })}
          </Link>
        ) : undefined
      }
    />
  );
}

/** A side's whole list, as its "+N" tile and the post's Show all open it. */
export function SideAllDialog({
  side,
  narrowed,
  collections,
  onOpen,
  open,
  onOpenChange,
  finalFocus,
  owner = false,
  actions,
}: SideProps & {
  collections: Readonly<Record<string, ValidObjekt | undefined>>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  finalFocus?: RefObject<HTMLElement | null>;
  /** the sheet footer's Message and Make offer, on another person's post */
  actions?: ReactNode;
}) {
  return (
    <SideItemsSheet
      side={side}
      narrowed={narrowed}
      open={open}
      onOpenChange={onOpenChange}
      onOpen={onOpen}
      finalFocus={finalFocus}
      owner={owner}
      actions={actions}
      rules={
        side.rules.length > 0 ? (
          // the objekt view is a modal of its own, so the sheet gives way to it
          <RuleTiles
            tiles={side.rules}
            collections={collections}
            onOpen={(objekt) => {
              onOpenChange(false);
              onOpen(objekt);
            }}
            owner={owner}
          />
        ) : undefined
      }
    />
  );
}
