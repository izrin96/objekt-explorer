import type { ValidObjekt } from "@repo/lib/types/objekt";
import { Link } from "@tanstack/react-router";
import { type ReactNode, memo } from "react";

import { getListLinkOption } from "@/features/list/list-link";
import { LIST_TYPE_LABEL, LIST_TYPE_TONE } from "@/features/list/list-type-badge";
import { RatioChip } from "@/features/list/ratio-chip";
import { type RatioSide, ratioName } from "@/features/list/ratio-text";
import { ObjektCard, QTY_BADGE, RATIO_ON_CARD } from "@/features/objekt/objekt-card";
import { useElementSize } from "@/hooks/use-element-size";
import { nearRingText } from "@/lib/near-text";
import { formatCount } from "@/lib/number";
import { TONE_INK } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import type { Surface } from "./browse-search";
import type { NearOpen, OpenObjekt } from "./near";
import type { PostSideData } from "./post-types";
import { fitCount, hiddenCopies } from "./strip-fit";
import { NEAR_RING, RING, SlugTile } from "./thumb-grid";

/** `w-10` and `gap-1.5`, in px */
const FIT = { thumb: 40, gap: 6, fallback: 4, lines: 1 };

/** top-start, clear of the ratio chip on a tile too narrow for both along the bottom */
const STACK_COUNT = cn(QTY_BADGE, "pointer-events-none absolute start-0.5 top-0.5");

type StripItem = {
  key: string | number;
  slug: string;
  qty?: number;
  ringed?: boolean;
  near?: NearOpen;
  ratio?: number;
};

/**
 * One side of a post or a partner: a label over up to two lines of thumbnails. It draws as many as
 * fit its width and ends in a "+N" tile for the rest, so it never wraps a third line.
 */
export function PostStrip({
  lead,
  label,
  tone,
  items,
  hidden = 0,
  copies,
  collections,
  onOpen,
  more,
  othersLink,
  rules,
  ratio,
}: {
  /** before the label, on its line: the post's tag */
  lead?: ReactNode;
  label: ReactNode;
  tone: string;
  items: readonly StripItem[];
  /** collections the caller has not sent, past `items`: they take a tile each, until "+N" */
  hidden?: number;
  /**
   * every copy the side holds: "+N" counts the ones no drawn tile covers, as the label does.
   * Left out when the label counts collections, and "+N" counts the collections not drawn.
   */
  copies?: number;
  collections: Readonly<Record<string, ValidObjekt | undefined>>;
  onOpen: OpenObjekt;
  more: (count: number) => ReactNode;
  /** after the thumbnails and the "+N" tile: the objekts a filter left out */
  othersLink?: ReactNode;
  /** a want side's rule tiles, drawn before its objekts */
  rules?: ReactNode;
  /** how a tile's ratio chip reads; none on a side that carries no ratio */
  ratio?: { side: RatioSide; owner: boolean };
}) {
  const [ref, { width }] = useElementSize<HTMLUListElement>();
  const [linkRef, { width: linkWidth }] = useElementSize<HTMLLIElement>();
  // a hidden collection draws as the "+N" tile, so it counts as one more place
  const places = items.length + (hidden > 0 ? 1 : 0);
  const shown = items.slice(0, fitCount(width, places, { ...FIT, reserve: linkWidth }));
  const rest =
    copies === undefined ? items.length - shown.length + hidden : hiddenCopies(copies, shown);

  return (
    <section className="flex min-w-0 flex-col gap-1">
      <h3
        className={cn(
          "flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs uppercase",
          tone,
        )}
      >
        {lead}
        {label}
      </h3>
      {rules}
      {/* padding gives the ring room */}
      <ul ref={ref} className="-m-1 flex items-start gap-1.5 overflow-hidden p-1">
        {shown.map((item) => (
          <StripTile
            key={item.key}
            slug={item.slug}
            qty={item.qty ?? 1}
            ringed={item.ringed ?? false}
            near={item.near}
            collection={collections[item.slug]}
            onOpen={onOpen}
            ratio={item.ratio}
            ratioSide={ratio?.side}
            owner={ratio?.owner ?? false}
          />
        ))}
        {rest > 0 ? <li className="@container w-10 shrink-0">{more(rest)}</li> : null}
        {othersLink ? (
          <li ref={linkRef} className="shrink-0 self-center">
            {othersLink}
          </li>
        ) : null}
      </ul>
    </section>
  );
}

/**
 * Memoized: the strip renders again once it has measured its width, and without the memo every
 * card it already drew would render with it.
 */
const StripTile = memo(function StripTile({
  slug,
  qty,
  ringed,
  near,
  collection,
  onOpen,
  ratio,
  ratioSide,
  owner,
}: {
  slug: string;
  qty: number;
  ringed: boolean;
  near: NearOpen | undefined;
  collection: ValidObjekt | undefined;
  onOpen: OpenObjekt;
  ratio: number | undefined;
  ratioSide: RatioSide | undefined;
  owner: boolean;
}) {
  const stacked = qty > 1;
  const description = near
    ? nearRingText(near.verb, qty)
    : stacked
      ? ringed
        ? m.trade_stack_copies_ring({ count: formatCount(qty) })
        : m.trade_stack_copies({ count: formatCount(qty) })
      : ringed
        ? m.trade_match_ring()
        : undefined;
  const ring = ringed ? RING : near ? NEAR_RING : undefined;
  return (
    /* a container, so the slug tile's radius matches the cards' */
    <li
      className="@container relative w-10 shrink-0"
      // the chip lies inert over the card, so the tile carries its tooltip
      title={ratio !== undefined && ratioSide ? ratioName(ratio, ratioSide, { owner }) : undefined}
    >
      {collection ? (
        <ObjektCard
          objekt={collection}
          image="thumbnail"
          hideLabel
          onOpen={(objekt) => onOpen(objekt, near)}
          className={ring}
          description={description}
        />
      ) : (
        <SlugTile className={cn("text-xxs p-0.5", ring)}>
          {slug}
          {description ? <span className="sr-only">{description}</span> : null}
        </SlugTile>
      )}
      {stacked ? (
        <span aria-hidden className={STACK_COUNT}>
          {qty}
        </span>
      ) : null}
      {ratio !== undefined && ratioSide ? (
        <RatioChip ratio={ratio} side={ratioSide} owner={owner} className={RATIO_ON_CARD} />
      ) : null}
    </li>
  );
});

/** A side with no objekts, narrowed out or never listed: it shows as one line, not a strip. */
export function isEmptySide(side: PostSideData) {
  return side.copyCount === 0;
}

/** A side's role, and why none of its objekts show: on For you who they would be for. */
function sideWording(side: PostSideData, surface: Surface) {
  const role = LIST_TYPE_LABEL[side.role]();
  if (surface === "browse") return { role, none: m.trade_strip_none_match() };
  const wanted = side.role === "want";
  return {
    role,
    none: wanted ? m.trade_strip_none_you_have() : m.trade_strip_none_you_want(),
  };
}

/**
 * A post's sides with a description, one per text: a pair often carries the same one twice, at
 * times apart only in whitespace saved before the form trimmed it.
 */
function notedSides(sides: readonly PostSideData[]) {
  const seen = new Set<string>();
  return sides.filter((side) => {
    const text = side.list.description?.replace(/\s+/g, " ").trim();
    if (!text || seen.has(text)) return false;
    seen.add(text);
    return true;
  });
}

/**
 * A post's list descriptions, in one block under all its sides: beside one strip, a description
 * would push its thumbnails below the other's. With two, each leads with its side's role.
 */
export function SideNotes({ sides }: { sides: readonly PostSideData[] }) {
  const noted = notedSides(sides);
  if (noted.length === 0) return null;
  return (
    <div className="border-border flex flex-col gap-1 border-s-2 ps-2.5">
      {noted.map((side) => (
        <p
          key={side.list.id}
          className="text-muted-foreground line-clamp-8 text-xs text-pretty break-words whitespace-pre-wrap"
        >
          {noted.length > 1 ? (
            <>
              <span className={cn("uppercase", TONE_INK[LIST_TYPE_TONE[side.role]])}>
                {LIST_TYPE_LABEL[side.role]()}
              </span>{" "}
            </>
          ) : null}
          {side.list.description}
        </p>
      ))}
    </div>
  );
}

export const SIDE_LINK =
  "focus-visible:ring-ring rounded-sm underline-offset-2 outline-none hover:underline focus-visible:ring-2";

/** A side with nothing related, under the post's other strip: its role and total, then why. */
export function EmptySide({ side, surface }: { side: PostSideData; surface: Surface }) {
  const wording = sideWording(side, surface);
  // a unit on the count, so it doesn't read as a number of matches
  const detail =
    side.others === 0
      ? m.trade_strip_none_listed()
      : side.others === 1
        ? m.trade_strip_side_count_one({ none: wording.none })
        : m.trade_strip_side_count({
            count: formatCount(side.others),
            none: wording.none,
          });
  return (
    <Link
      {...getListLinkOption(side.list)}
      className={cn(
        "text-muted-foreground hover:text-foreground w-fit text-xs uppercase",
        SIDE_LINK,
      )}
    >
      {wording.role}
      <span className="normal-case">
        {" · "}
        {detail}
      </span>
    </Link>
  );
}
