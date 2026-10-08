import type { ValidObjekt } from "@repo/lib/types/objekt";
import { Link } from "@tanstack/react-router";

import { getListLinkOption } from "@/features/list/list-link";
import { ObjektCard } from "@/features/objekt/objekt-card";
import { formatCurrency } from "@/features/settings/use-currency";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { ListRoleBadge } from "./list-role-badge";
import type { PostSideData } from "./post-types";
import { SlugTile, THUMB_GRID, TILE } from "./thumb-grid";

/** monochrome on purpose: the class stripes stay the only colour in the grid */
const RING = "ring-foreground ring-offset-card ring-2 ring-offset-2";
/**
 * Drawn inside the artwork (its first child) by a pseudo-element, so the card's own
 * focus ring, a box-shadow on the same element, still shows on a ringed card.
 */
const CARD_RING =
  "*:first:after:pointer-events-none *:first:after:absolute *:first:after:inset-0 *:first:after:rounded-photocard *:first:after:border-2 *:first:after:border-foreground *:first:after:shadow-[inset_0_0_0_2px_var(--color-card)]";

export function PostSide({
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

  return (
    <section className="flex flex-col gap-2">
      <h3 className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <ListRoleBadge type={side.role} />
        <Link
          {...getListLinkOption(list)}
          className="min-w-0 font-medium break-words underline-offset-2 hover:underline"
        >
          {list.name}
        </Link>
        {currency ? (
          <span className="text-muted-foreground font-mono text-xs">({currency})</span>
        ) : null}
      </h3>
      {list.description ? (
        <p className="text-muted-foreground line-clamp-2 text-sm text-pretty break-words whitespace-pre-wrap">
          {list.description}
        </p>
      ) : null}
      <ul className={THUMB_GRID}>
        {side.items.map((item) => {
          const collection = collections[item.slug];
          return (
            /* a container, so the slug tile's radius matches the cards' */
            <li key={item.entryId} className="@container min-w-0">
              {collection ? (
                <ObjektCard
                  objekt={collection}
                  image="thumbnail"
                  onOpen={() => onOpen(collection)}
                  captionClassName="text-xs"
                  price={priceOf(item)}
                  priceMuted={item.isQyop}
                  className={item.ringed ? CARD_RING : undefined}
                  description={item.ringed ? m.trade_match_ring() : undefined}
                />
              ) : (
                <SlugTile className={cn(item.ringed && RING)}>
                  {item.slug}
                  {item.ringed ? <span className="sr-only">{m.trade_match_ring()}</span> : null}
                </SlugTile>
              )}
            </li>
          );
        })}
        {side.more > 0 ? (
          <li className="@container self-start">
            <Link
              {...getListLinkOption(list)}
              className={cn(
                TILE,
                "hover:text-foreground focus-visible:ring-ring text-sm tabular-nums outline-none focus-visible:ring-2",
              )}
            >
              <span aria-hidden>+{side.more}</span>
              <span className="sr-only">{m.trade_more_count({ count: side.more })}</span>
            </Link>
          </li>
        ) : null}
      </ul>
    </section>
  );
}
