import { CaretDownIcon, ListBulletsIcon, NoteIcon, StorefrontIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { TimeAgo } from "@/components/shared/time-ago";
import { Button } from "@/components/ui/button";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { formatMyr, type LabListing, listingsFor, marketSummary } from "@/fixtures/market";

type MarketSort = "price" | "date";

function SortButton({
  active,
  descending,
  onClick,
  children,
}: {
  active: boolean;
  descending: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button variant={active ? "default" : "outline"} size="xs" onClick={onClick}>
      {children}
      {active && <CaretDownIcon className={descending ? undefined : "rotate-180"} />}
    </Button>
  );
}

/**
 * Port of `apps/website/src/components/objekt/market-view.tsx`. There is no
 * public listings API, so the order book comes from `fixtures/market.ts` —
 * the same generator the `/market` grid reads, so the floor prices agree.
 */
export function MarketPanel({
  slug,
  onOpenSerial,
  onClose,
}: {
  slug: string;
  onOpenSerial: (serial: number) => void;
  onClose: () => void;
}) {
  const [sort, setSort] = useState<MarketSort>("price");
  const [descending, setDescending] = useState(false);

  const stats = useMemo(() => marketSummary(slug), [slug]);
  const rows = useMemo(() => {
    const listings = [...listingsFor(slug)];
    const dir = descending ? -1 : 1;
    listings.sort((a, b) => {
      if (sort === "date") return (a.listedAt.getTime() - b.listedAt.getTime()) * dir;
      // QYOP listings have no price; they sink to the bottom either way
      if (a.price === null || b.price === null)
        return Number(a.price === null) - Number(b.price === null);
      return (a.price - b.price) * dir;
    });
    return listings;
  }, [slug, sort, descending]);

  const toggleSort = (field: MarketSort) => {
    if (sort === field) {
      setDescending((prev) => !prev);
      return;
    }
    setSort(field);
    // cheapest first, newest first — the default each field is most useful in
    setDescending(field === "date");
  };

  const cells: [string, string][] = [
    ["Floor", stats.floor === null ? "—" : formatMyr(stats.floor)],
    ["Listings", stats.listings.toLocaleString()],
    ["Sellers", stats.sellers.toLocaleString()],
  ];

  return (
    <div className="flex flex-col gap-2.5">
      <div className="bg-secondary grid grid-cols-3 gap-2 rounded-lg border p-3">
        {cells.map(([label, value]) => (
          <div key={label} className="flex flex-col">
            <span className="text-muted-foreground text-[11px]">{label}</span>
            <span className="font-mono text-sm font-medium tabular-nums">{value}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        <SortButton
          active={sort === "price"}
          descending={descending}
          onClick={() => toggleSort("price")}
        >
          Price
        </SortButton>
        <SortButton
          active={sort === "date"}
          descending={descending}
          onClick={() => toggleSort("date")}
        >
          Date
        </SortButton>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={StorefrontIcon}
          title="Nothing listed for sale"
          hint="No one is selling this objekt right now. Listings show up here as soon as one lands."
          bordered={false}
        />
      ) : (
        <div className="flex flex-col gap-1.5">
          {rows.map((listing) => (
            <MarketRow
              key={listing.id}
              listing={listing}
              onOpenSerial={onOpenSerial}
              onClose={onClose}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MarketRow({
  listing,
  onOpenSerial,
  onClose,
}: {
  listing: LabListing;
  onOpenSerial: (serial: number) => void;
  onClose: () => void;
}) {
  return (
    <div className="bg-card grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-lg border px-3 py-2 text-sm">
      <div className="flex flex-col">
        <span className="text-muted-foreground text-[11px]">Serial</span>
        <button
          type="button"
          className="hover:text-accent-solid w-fit cursor-pointer font-mono font-medium tabular-nums underline-offset-2 hover:underline"
          onClick={() => onOpenSerial(listing.serial)}
        >
          #{listing.serial}
        </button>
      </div>

      <div className="flex min-w-0 flex-col">
        <span className="text-muted-foreground text-[11px]">Seller</span>
        <Link
          to="/profile/$nickname"
          params={{ nickname: listing.seller }}
          onClick={onClose}
          className="truncate underline-offset-2 hover:underline"
        >
          {listing.seller}
        </Link>
      </div>

      <div className="flex flex-col items-end">
        <span className="text-muted-foreground text-[11px]">Price</span>
        <div className="flex items-center gap-1">
          <span className="font-mono font-medium tabular-nums">
            {listing.price === null ? "QYOP" : formatMyr(listing.price)}
          </span>
          {listing.note && (
            <Popover>
              <PopoverTrigger
                render={<Button variant="ghost" size="icon-xs" aria-label="Listing note" />}
              >
                <NoteIcon />
              </PopoverTrigger>
              <PopoverPopup padding="sm" className="max-w-64 text-sm">
                <span className="text-muted-foreground">Note: </span>
                {listing.note}
              </PopoverPopup>
            </Popover>
          )}
        </div>
      </div>

      <div className="col-span-full -mt-1 flex items-center gap-2">
        <span className="text-muted-foreground min-w-0 truncate font-mono text-[11px]">
          listed <TimeAgo date={listing.listedAt} /> · {listing.list.name}
        </span>
        <Button
          variant="outline"
          size="xs"
          className="ml-auto"
          render={<Link to="/list/$slug" params={{ slug: listing.list.slug }} onClick={onClose} />}
        >
          <ListBulletsIcon />
          View list
        </Button>
      </div>
    </div>
  );
}
