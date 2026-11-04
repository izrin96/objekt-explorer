import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useState } from "react";

import { InfiniteSentinel } from "@/components/shared/infinite-sentinel";
import { Skeleton } from "@/components/ui/skeleton";
import { bannerThumbFrameClass } from "@/features/profile/banner-thumb";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { BannerTile } from "./banner-tile";
import { bannersOptions } from "./queries";

const GRID = "grid gap-x-4 gap-y-6 sm:grid-cols-2 xl:grid-cols-3";

export function BannerFeed() {
  const query = useSuspenseInfiniteQuery(bannersOptions());
  const [removing, setRemoving] = useState<number | null>(null);
  const banners = query.data.pages.flatMap((page) => page.banners);

  if (banners.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-10 text-center text-sm">
        {m.mod_banners_empty()}
      </p>
    );
  }

  return (
    <>
      <ul className={GRID}>
        {banners.map((banner) => (
          <BannerTile
            key={banner.id}
            banner={banner}
            removing={removing === banner.id}
            onRemove={() => setRemoving(banner.id)}
            onClose={() => setRemoving(null)}
          />
        ))}
      </ul>
      <InfiniteSentinel
        label={m.infinite_query_load_more_aria()}
        hasNextPage={query.hasNextPage}
        isFetchingNextPage={query.isFetchingNextPage}
        isError={query.isFetchNextPageError}
        fetchNextPage={() => void query.fetchNextPage({ cancelRefetch: false })}
      />
    </>
  );
}

export function BannerFeedSkeleton() {
  return (
    <ul className={GRID} aria-hidden>
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i} className="flex flex-col gap-2">
          <Skeleton className={cn(bannerThumbFrameClass, "rounded-lg border-0")} />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </li>
      ))}
    </ul>
  );
}
