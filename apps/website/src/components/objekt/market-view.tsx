import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { StorefrontIcon } from "@phosphor-icons/react/dist/ssr";
import { useInfiniteQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useState } from "react";

import { Button } from "@/components/intentui/button";
import { Link } from "@/components/intentui/link";
import { Skeleton } from "@/components/intentui/skeleton";
import { orpc } from "@/lib/orpc/client";
import type { PublicList } from "@/lib/universal/list";
import type { MarketListing, SortBy, SortDir } from "@/lib/universal/market";
import { getListLinkOption, parseNickname } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { InfiniteQueryNext } from "../shared/infinite-query-pending";

type Props = {
  collectionSlug: string;
};

export default function MarketView({ collectionSlug }: Props) {
  const [sortBy, setSortBy] = useState<SortBy>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const toggleSort = (field: SortBy) => {
    if (sortBy === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir(field === "price" ? "asc" : "desc");
    }
  };

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status, isPending } =
    useInfiniteQuery(
      orpc.market.marketListings.infiniteOptions({
        input: (pageParam: number) => ({
          collectionSlug,
          sortBy,
          sortDir,
          offset: pageParam,
          limit: 20,
        }),
        initialPageParam: 0,
        getNextPageParam: (lastPage) => lastPage.nextOffset,
        staleTime: 1000 * 60,
      }),
    );

  const items = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <SortButton active={sortBy === "price"} dir={sortDir} onClick={() => toggleSort("price")}>
          {m.list_manage_objekt_set_price_label()}
        </SortButton>
        <SortButton
          active={sortBy === "createdAt"}
          dir={sortDir}
          onClick={() => toggleSort("createdAt")}
        >
          {m.objekt_date()}
        </SortButton>
      </div>

      {isPending ? (
        <MarketSkeleton />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-6">
          <StorefrontIcon size={64} weight="light" />
          <span>{m.objekt_market_empty()}</span>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {items.map((item) => (
              <MarketRow key={item.id} item={item} />
            ))}
          </div>
          <InfiniteQueryNext
            status={status}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={fetchNextPage}
          />
        </>
      )}
    </div>
  );
}

function SortButton({
  active,
  dir,
  onClick,
  children,
}: {
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      size="xs"
      intent={active ? "primary" : "outline"}
      onPress={onClick}
      className="gap-1 *:[svg]:transition-transform *:[svg]:duration-200"
    >
      {children}
      {active && <ChevronDownIcon className={dir === "asc" ? "rotate-180" : ""} />}
    </Button>
  );
}

function MarketRow({ item }: { item: MarketListing }) {
  return (
    <Link
      {...getListLinkOption(item.list as PublicList)}
      className="hover:bg-secondary bg-muted block overflow-hidden rounded-lg border transition-colors"
    >
      <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-2 p-3 text-sm lg:grid-cols-[5rem_8rem_8rem_1fr]">
        <div className="flex flex-col justify-center">
          <span className="text-muted-fg text-xxs">{m.objekt_serial()}</span>
          <div className="font-mono font-medium tabular-nums">#{item.serial ?? "-"}</div>
        </div>

        {/* <div className="flex flex-col justify-center">
          <span className="text-muted-fg text-xxs">{m.objekt_transferable()}</span>
          <div>
            {item.transferable === null ? (
              "-"
            ) : (
              <Badge intent={item.transferable ? "info" : "danger"}>
                {item.transferable ? m.objekt_yes() : m.objekt_no()}
              </Badge>
            )}
          </div>
        </div> */}

        <div className="flex flex-col justify-center">
          <span className="text-muted-fg text-xxs">{m.objekt_owner()}</span>
          <div className="truncate">
            {item.list.profile
              ? parseNickname(item.list.profile.address, item.list.profile.nickname)
              : "-"}
          </div>
        </div>

        <div className="flex flex-col justify-center">
          <span className="text-muted-fg text-xxs">{m.list_manage_objekt_set_price_label()}</span>
          <div className="truncate font-medium">
            {item.isQyop ? (
              m.objekt_qyop()
            ) : item.usdPrice !== null ? (
              <>
                ${item.usdPrice.toFixed(2)}
                {item.currency && item.currency !== "USD" && (
                  <span className="text-muted-fg text-xxs ml-1">
                    ({item.price?.toLocaleString()} {item.currency})
                  </span>
                )}
              </>
            ) : (
              "-"
            )}
          </div>
        </div>

        <div className="flex flex-col justify-center">
          <span className="text-muted-fg text-xxs">{m.objekt_date()}</span>
          <div className="truncate text-xs">{format(item.createdAt, "yyyy/MM/dd h:mm:ss a")}</div>
        </div>
      </div>
    </Link>
  );
}

function MarketSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 2 }).map((_, i) => (
        <Skeleton key={i} className="h-[64px] rounded-lg" soft />
      ))}
    </div>
  );
}
