import type { ValidObjekt } from "@repo/lib/types/objekt";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { getListLinkOption } from "@/features/list/list-link";
import { LIST_TYPE_LABEL, LIST_TYPE_TONE } from "@/features/list/list-type-badge";
import { ObjektCard } from "@/features/objekt/objekt-card";
import { formatCurrency } from "@/features/settings/use-currency";
import { useElementSize } from "@/hooks/use-element-size";
import { TONE_INK } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import type { PostSideData } from "./post-types";
import { fitCount } from "./strip-fit";
import { SlugTile, TILE } from "./thumb-grid";

/** `w-14` and `gap-1.5`, in px */
const FIT = { thumb: 56, gap: 6, fallback: 4 };

/** monochrome on purpose: the class stripes stay the only colour in the grid */
const RING = "ring-foreground ring-offset-card ring-2 ring-offset-2";
/**
 * Drawn inside the artwork (its first child) by a pseudo-element, so the card's own
 * focus ring, a box-shadow on the same element, still shows on a ringed card.
 */
const CARD_RING =
  "*:first:after:pointer-events-none *:first:after:absolute *:first:after:inset-0 *:first:after:rounded-photocard *:first:after:border-2 *:first:after:border-foreground *:first:after:shadow-[inset_0_0_0_2px_var(--color-card)]";

export const STRIP_MORE =
  "hover:text-foreground focus-visible:ring-ring text-xs tabular-nums outline-none focus-visible:ring-2";

export type StripItem = {
  key: string | number;
  slug: string;
  ringed?: boolean;
  price?: string;
  priceMuted?: boolean;
};

/** The "+N" tile's face; the caller wraps it in the link or button that goes somewhere. */
export function StripMore({ count }: { count: number }) {
  return (
    <>
      <span aria-hidden>+{count}</span>
      <span className="sr-only">{m.trade_more_count({ count })}</span>
    </>
  );
}

/**
 * One side of a post or a partner: a label over one line of thumbnails. It draws as many as
 * fit its width and ends in a "+N" tile for the rest, so it never wraps.
 */
export function PostStrip({
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
        <ul ref={ref} className="-m-1 flex flex-nowrap items-start gap-x-1.5 overflow-hidden p-1">
          {shown.map((item) => {
            const collection = collections[item.slug];
            return (
              /* a container, so the slug tile's radius matches the cards' */
              <li key={item.key} className="@container w-14 shrink-0">
                {collection ? (
                  <ObjektCard
                    objekt={collection}
                    image="thumbnail"
                    hideLabel
                    onOpen={() => onOpen(collection)}
                    captionClassName="font-mono"
                    price={item.price}
                    priceMuted={item.priceMuted}
                    className={item.ringed ? CARD_RING : undefined}
                    description={item.ringed ? m.trade_match_ring() : undefined}
                  />
                ) : (
                  <SlugTile className={cn("text-xxs p-0.5", item.ringed && RING)}>
                    {item.slug}
                    {item.ringed ? <span className="sr-only">{m.trade_match_ring()}</span> : null}
                  </SlugTile>
                )}
              </li>
            );
          })}
          {rest > 0 ? <li className="@container w-14 shrink-0">{more(rest)}</li> : null}
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

/** A Browse post's side: its list's role and count, its sale prices, its ringed matches. */
export function SideStrip({
  side,
  collections,
  onOpen,
}: {
  side: PostSideData;
  collections: Readonly<Record<string, ValidObjekt | undefined>>;
  onOpen: (objekt: ValidObjekt) => void;
}) {
  const { list } = side;
  const currency = side.role === "sale" ? list.currency : null;
  const priceOf = (item: PostSideData["items"][number]) => {
    if (side.role !== "sale") return undefined;
    if (item.isQyop) return m.objekt_qyop();
    return item.price !== null && currency ? formatCurrency(item.price, currency) : undefined;
  };

  const shown = side.items.length + side.more;
  const figure = side.others > 0 ? m.trade_strip_of({ shown, total: shown + side.others }) : shown;

  return (
    <PostStrip
      label={`${LIST_TYPE_LABEL[side.role]()} ${figure}`}
      tone={TONE_INK[LIST_TYPE_TONE[side.role]]}
      items={side.items.map((item) => ({
        key: item.entryId,
        slug: item.slug,
        ringed: item.ringed,
        price: priceOf(item),
        priceMuted: item.isQyop,
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
        side.others > 0 ? (
          <Link
            {...getListLinkOption(list)}
            className="text-muted-foreground hover:text-foreground text-xs whitespace-nowrap tabular-nums underline-offset-2 outline-none hover:underline focus-visible:ring-2"
          >
            {m.trade_strip_others({ count: side.others })}
          </Link>
        ) : undefined
      }
    />
  );
}
