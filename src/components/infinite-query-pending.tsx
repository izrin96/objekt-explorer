import { QueryStatus } from "@tanstack/react-query";
import { IconChevronDown, IconShieldCheck } from "justd-icons";
import { InView } from "react-intersection-observer";
import { Loader } from "./ui";

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
          onChange={onInView}
          onClick={fetchNextPage}
          disabled={!hasNextPage || isFetchingNextPage}
        >
          <IconChevronDown />
        </InView>
      )}

      {isFetchingNextPage && <Loader />}

      {status === "success" && !hasNextPage && <IconShieldCheck />}
    </div>
  );
}
