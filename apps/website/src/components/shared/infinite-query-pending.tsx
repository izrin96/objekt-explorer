import { CaretDownIcon, FlagBannerFoldIcon } from "@phosphor-icons/react/dist/ssr";
import type { QueryStatus } from "@tanstack/react-query";
import { InView } from "react-intersection-observer";

import { Loader } from "@/components/intentui/loader";
import { m } from "@/paraglide/messages";

type Props = {
  status: QueryStatus;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
};

export function InfiniteQueryNext({
  status,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: Props) {
  function onInView(inView: boolean) {
    if (inView) fetchNextPage();
  }

  return (
    <div className="flex justify-center py-6">
      {status === "success" && hasNextPage && !isFetchingNextPage && (
        <InView
          rootMargin="0px 0px 900px 0px"
          as="button"
          aria-label={m.infinite_query_load_more_aria()}
          onChange={onInView}
          onClick={fetchNextPage}
          disabled={!hasNextPage || isFetchingNextPage}
        >
          <CaretDownIcon size={16} weight="regular" />
        </InView>
      )}

      {isFetchingNextPage && <Loader variant="ring" />}

      {status === "success" && !hasNextPage && <FlagBannerFoldIcon size={32} weight="light" />}
    </div>
  );
}
