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
import { fitCount } from "./strip-fit";
import { SlugTile, TILE } from "./thumb-grid";

/** `w-10` and `gap-1.5`, in px */
const FIT = { thumb: 40, gap: 6, fallback: 4, lines: 1 };

/** monochrome on purpose: the class stripes stay the only colour in the grid */
const RING = "ring-foreground ring-offset-card ring-2 ring-offset-2";
/**
 * Drawn inside the artwork (its first child) by a pseudo-element, so the card's own
 * focus ring, a box-shadow on the same element, still shows on a ringed card.
 */
const CARD_RING =
  "*:first:after:pointer-events-none *:first:after:absolute *:first:after:inset-0 *:first:after:rounded-photocard *:first:after:border-2 *:first:after:border-foreground *:first:after:shadow-[inset_0_0_0_2px_var(--color-card)]";

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
  collections,
  onOpen,
  more,
  othersLink,
}: {
  label: ReactNode;
  tone: string;
  items: readonly StripItem[];
  /** objekts the caller has not sent, past `items` */
  hidden?: number;
  collections: Readonly<Record<string, ValidObjekt | undefined>>;
  onOpen: (objekt: ValidObjekt) => void;
  more: (count: number) => ReactNode;
  /** after the thumbnails and the "+N" tile: the objekts a filter left out */
  othersLink?: ReactNode;
}) {
  const [ref, { width }] = useElementSize<HTMLUListElement>();
  const [linkRef, { width: linkWidth }] = useElementSize<HTMLLIElement>();
  const total = items.length + hidden;
  const shown = items.slice(0, fitCount(width, total, { ...FIT, reserve: linkWidth }));
  const rest = total - shown.length;

  return (
    <section className="flex min-w-0 flex-col gap-1">
      <h3 className={cn("font-mono text-xs uppercase tabular-nums", tone)}>{label}</h3>
      {total === 0 && !othersLink ? (
        <p className="text-muted-foreground text-sm">{m.trade_strip_none()}</p>
      ) : (
        /* padding gives the ring room */
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
                    className={item.ringed ? CARD_RING : undefined}
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
      )}
    </section>
  );
}

/** A side none of whose objekts survive the narrowing: it shows as one line, not a strip. */
export function isEmptySide(side: PostSideData) {
  return side.copyCount === 0 && side.others > 0;
}

/** A side's wording: its label, and on For you who its objekts are for. */
function sideWording(side: PostSideData, surface: Surface) {
  const role = LIST_TYPE_LABEL[side.role]();
  if (surface === "browse") {
    return { role, label: (count: number) => `${role} ${count}`, none: m.trade_strip_none_match() };
  }
  const wanted = side.role === "want";
  return {
    role,
    label: (count: number) =>
      wanted ? m.trade_strip_you_have({ role, count }) : m.trade_strip_you_want({ role, count }),
    none: wanted ? m.trade_strip_none_you_have() : m.trade_strip_none_you_want(),
  };
}

const SIDE_LINK =
  "focus-visible:ring-ring rounded-sm underline-offset-2 outline-none hover:underline focus-visible:ring-2";

/** A side with nothing related, under the post's other strip: its role and total, then why. */
export function EmptySide({ side, surface }: { side: PostSideData; surface: Surface }) {
  const { role, none } = sideWording(side, surface);
  return (
    <Link
      {...getListLinkOption(side.list)}
      className={cn(
        "text-muted-foreground hover:text-foreground w-fit font-mono text-xs uppercase tabular-nums",
        SIDE_LINK,
      )}
    >
      {role} {side.others}
      <span className="normal-case">
        {" · "}
        {none}
      </span>
    </Link>
  );
}

/**
 * A Browse post's side: its list's role and count, its ringed matches. A post holding one list
 * makes the label the link to it, since it has no Lists control.
 */
export function SideStrip({
  side,
  surface,
  narrowed,
  labelLink,
  collections,
  onOpen,
}: {
  side: PostSideData;
  surface: Surface;
  /** a filter or matching left objekts out, so the side says how many it holds */
  narrowed: boolean;
  labelLink: boolean;
  collections: Readonly<Record<string, ValidObjekt | undefined>>;
  onOpen: (objekt: ValidObjekt) => void;
}) {
  const { list } = side;
  const label = sideWording(side, surface).label(side.copyCount);
  const total = side.copyCount + side.others;
  const text = labelLink ? (
    <Link {...getListLinkOption(list)} className={SIDE_LINK}>
      {label}
      <span className="sr-only">: {list.name}</span>
    </Link>
  ) : (
    label
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
