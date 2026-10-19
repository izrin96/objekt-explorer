import type { ValidObjekt } from "@repo/lib/types/objekt";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { getListLinkOption } from "@/features/list/list-link";
import { LIST_TYPE_LABEL, LIST_TYPE_TONE } from "@/features/list/list-type-badge";
import { ObjektCard } from "@/features/objekt/objekt-card";
import { useElementSize } from "@/hooks/use-element-size";
import { TONE_INK } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import type { Surface } from "./browse-search";
import type { PostSideData } from "./post-types";
import { fitCount, hiddenCopies } from "./strip-fit";
import { SlugTile, TILE } from "./thumb-grid";

/** `w-10` and `gap-1.5`, in px */
const FIT = { thumb: 40, gap: 6, fallback: 4, lines: 1 };

/**
 * Monochrome on purpose: the class stripes stay the only colour in the grid. An outline, so the
 * card's own focus ring (a box-shadow) still shows on a ringed card; a 1px offset keeps two
 * ringed neighbours `gap-1.5` apart from overlapping, and the strip's `p-1` gives the edges room.
 */
const RING = "rounded-photocard outline-foreground outline-2 outline-offset-1";

/** `ObjektCard`'s own count scales with the card, too small to read at `w-10` */
const STACK_COUNT =
  "pointer-events-none absolute top-0.5 left-0.5 rounded-full bg-[rgba(10,12,16,.82)] px-1 font-mono text-xxs leading-4 font-semibold text-white tabular-nums";

const STRIP_MORE =
  "hover:text-foreground focus-visible:ring-ring text-xs tabular-nums outline-none focus-visible:ring-2";

type StripItem = {
  key: string | number;
  slug: string;
  qty?: number;
  ringed?: boolean;
};

/** The "+N" tile's face; the caller wraps it in the link or button that goes somewhere. */
function StripMore({ count }: { count: number }) {
  return (
    <>
      <span aria-hidden>+{count}</span>
      <span className="sr-only">{m.trade_more_count({ count })}</span>
    </>
  );
}

/**
 * One side of a post or a partner: a label over up to two lines of thumbnails. It draws as many as
 * fit its width and ends in a "+N" tile for the rest, so it never wraps a third line.
 */
function PostStrip({
  label,
  tone,
  items,
  hidden = 0,
  copies,
  collections,
  onOpen,
  more,
  othersLink,
}: {
  label: ReactNode;
  tone: string;
  items: readonly StripItem[];
  /** collections the caller has not sent, past `items`: they take a tile each, until "+N" */
  hidden?: number;
  /** every copy the side holds: "+N" counts the ones no drawn tile covers, as the label does */
  copies: number;
  collections: Readonly<Record<string, ValidObjekt | undefined>>;
  onOpen: (objekt: ValidObjekt) => void;
  more: (count: number) => ReactNode;
  /** after the thumbnails and the "+N" tile: the objekts a filter left out */
  othersLink?: ReactNode;
}) {
  const [ref, { width }] = useElementSize<HTMLUListElement>();
  const [linkRef, { width: linkWidth }] = useElementSize<HTMLLIElement>();
  // a hidden collection draws as the "+N" tile, so it counts as one more place
  const places = items.length + (hidden > 0 ? 1 : 0);
  const shown = items.slice(0, fitCount(width, places, { ...FIT, reserve: linkWidth }));
  const rest = hiddenCopies(copies, shown);

  return (
    <section className="flex min-w-0 flex-col gap-1">
      <h3 className={cn("font-mono text-xs uppercase tabular-nums", tone)}>{label}</h3>
      {/* padding gives the ring room */}
      <ul ref={ref} className="-m-1 flex items-start gap-1.5 overflow-hidden p-1">
        {shown.map((item) => {
          const collection = collections[item.slug];
          const qty = item.qty ?? 1;
          const stacked = qty > 1;
          const description = stacked
            ? item.ringed
              ? m.trade_stack_copies_ring({ count: qty })
              : m.trade_stack_copies({ count: qty })
            : item.ringed
              ? m.trade_match_ring()
              : undefined;
          return (
            /* a container, so the slug tile's radius matches the cards' */
            <li key={item.key} className="@container relative w-10 shrink-0">
              {collection ? (
                <ObjektCard
                  objekt={collection}
                  image="thumbnail"
                  hideLabel
                  onOpen={() => onOpen(collection)}
                  className={item.ringed ? RING : undefined}
                  description={description}
                />
              ) : (
                <SlugTile className={cn("text-xxs p-0.5", item.ringed && RING)}>
                  {item.slug}
                  {description ? <span className="sr-only">{description}</span> : null}
                </SlugTile>
              )}
              {stacked ? (
                <span aria-hidden className={STACK_COUNT}>
                  {qty}
                </span>
              ) : null}
            </li>
          );
        })}
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

const SIDE_LINK =
  "focus-visible:ring-ring rounded-sm underline-offset-2 outline-none hover:underline focus-visible:ring-2";

/** A side with nothing related, under the post's other strip: its role and total, then why. */
export function EmptySide({ side, surface }: { side: PostSideData; surface: Surface }) {
  const wording = sideWording(side, surface);
  const none = side.others > 0 ? wording.none : m.trade_strip_none_listed();
  return (
    <Link
      {...getListLinkOption(side.list)}
      className={cn(
        "text-muted-foreground hover:text-foreground w-fit font-mono text-xs uppercase tabular-nums",
        SIDE_LINK,
      )}
    >
      {wording.role} {side.others}
      <span className="normal-case">
        {" · "}
        {none}
      </span>
    </Link>
  );
}

/** A person's list: its role and name, its own count, its ringed matches; the label links to the list. */
export function SideStrip({
  side,
  count,
  narrowed,
  collections,
  onOpen,
}: {
  side: PostSideData;
  /** the collections of this list that match the viewer: "14 you want", "2 you have" */
  count: number;
  /** a filter or matching left objekts out, so the side says how many it holds */
  narrowed: boolean;
  collections: Readonly<Record<string, ValidObjekt | undefined>>;
  onOpen: (objekt: ValidObjekt) => void;
}) {
  const { list } = side;
  const role = LIST_TYPE_LABEL[side.role]();
  const total = side.copyCount + side.others;
  const text = (
    <Link
      {...getListLinkOption(list)}
      title={list.description ? `${list.name}\n${list.description}` : list.name}
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
      {list.description ? <span className="sr-only">. {list.description}</span> : null}
      {count > 0 ? (
        <span className="bg-success/10 text-success-foreground shrink-0 rounded px-1.5 normal-case">
          {side.role === "want"
            ? m.trade_list_count_you_have({ count })
            : m.trade_list_count_you_want({ count })}
        </span>
      ) : null}
    </Link>
  );

  return (
    <PostStrip
      label={text}
      tone={TONE_INK[LIST_TYPE_TONE[side.role]]}
      items={side.items.map((item) => ({
        key: item.entryId,
        slug: item.slug,
        qty: item.qty,
        ringed: item.ringed,
      }))}
      hidden={side.more}
      copies={side.copyCount}
      collections={collections}
      onOpen={onOpen}
      more={(count) => (
        <Link {...getListLinkOption(list)} className={cn(TILE, STRIP_MORE)}>
          <StripMore count={count} />
        </Link>
      )}
      othersLink={
        narrowed && total > 0 ? (
          <Link
            {...getListLinkOption(list)}
            className={cn(
              "text-muted-foreground hover:text-foreground text-xs whitespace-nowrap tabular-nums",
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
