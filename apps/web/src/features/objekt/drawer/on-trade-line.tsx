import { CaretRightIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { Skeleton } from "@/components/ui/skeleton";
import { collectionPostCountsOptions } from "@/features/trade/queries";

import { onTradeText } from "./market-listing";

/**
 * Hidden at zero on both sides: an empty Trade has nothing to link to. Its height is held
 * while it loads, so the table under it does not move.
 */
export function OnTradeLine({ slug }: { slug: string }) {
  const { data, isPending } = useQuery(collectionPostCountsOptions(slug));
  if (isPending) return <Skeleton className="h-9.5 rounded-lg" />;
  if (!data) return null;
  const text = onTradeText(data);
  if (text === null) return null;

  return (
    <Link
      to="/trade"
      search={{ slug }}
      className="hover:bg-secondary/60 focus-visible:ring-ring flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2"
    >
      <span className="tabular-nums">{text}</span>
      <CaretRightIcon className="text-muted-foreground size-4 shrink-0" aria-hidden />
    </Link>
  );
}
