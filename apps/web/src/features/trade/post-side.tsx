import type { ValidObjekt } from "@repo/lib/types/objekt";
import { Link } from "@tanstack/react-router";

import { getListLinkOption } from "@/features/list/list-link";
import { LIST_TYPE_LABEL, LIST_TYPE_TONE } from "@/features/list/list-type-badge";
import { ObjektCard } from "@/features/objekt/objekt-card";
import { formatCurrency } from "@/features/settings/use-currency";
import { TONE_INK } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import type { PostSideData } from "./post-types";
import { SlugTile, TILE } from "./thumb-grid";

/** ten and the "+N" tile fill one line of a half-width card */
const STRIP_LIMIT = 10;

/** monochrome on purpose: the class stripes stay the only colour in the grid */
const RING = "ring-foreground ring-offset-card ring-2 ring-offset-2";
/**
 * Drawn inside the artwork (its first child) by a pseudo-element, so the card's own
 * focus ring, a box-shadow on the same element, still shows on a ringed card.
 */
const CARD_RING =
  "*:first:after:pointer-events-none *:first:after:absolute *:first:after:inset-0 *:first:after:rounded-photocard *:first:after:border-2 *:first:after:border-foreground *:first:after:shadow-[inset_0_0_0_2px_var(--color-card)]";

/** One side of a post: its role, its thumbnails wrapping as far as they need, and a "+N" for the rest. */
export function PostStrip({
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
  const shown = side.items.slice(0, STRIP_LIMIT);
  const more = side.items.length - shown.length + side.more;

  return (
    <section className="grid grid-cols-[3rem_minmax(0,1fr)] items-start gap-2">
      <h3 className={cn("pt-5 font-mono text-xs uppercase", TONE_INK[LIST_TYPE_TONE[side.role]])}>
        {LIST_TYPE_LABEL[side.role]()}
      </h3>
      {/* padding gives the ring room */}
      <ul className="-m-1 flex flex-wrap items-start gap-x-1.5 gap-y-2 p-1">
        {shown.map((item) => {
          const collection = collections[item.slug];
          return (
            /* a container, so the slug tile's radius matches the cards' */
            <li key={item.entryId} className="@container w-10 shrink-0">
              {collection ? (
                <ObjektCard
                  objekt={collection}
                  image="thumbnail"
                  hideLabel
                  onOpen={() => onOpen(collection)}
                  captionClassName="font-mono"
                  price={priceOf(item)}
                  priceMuted={item.isQyop}
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
        {more > 0 ? (
          <li className="@container w-10 shrink-0">
            <Link
              {...getListLinkOption(list)}
              className={cn(
                TILE,
                "hover:text-foreground focus-visible:ring-ring text-xs tabular-nums outline-none focus-visible:ring-2",
              )}
            >
              <span aria-hidden>+{more}</span>
              <span className="sr-only">{m.trade_more_count({ count: more })}</span>
            </Link>
          </li>
        ) : null}
      </ul>
    </section>
  );
}
