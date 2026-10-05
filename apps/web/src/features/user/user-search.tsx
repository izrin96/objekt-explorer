import { ORPCError } from "@orpc/client";
import { UserIcon } from "@phosphor-icons/react";
import { MAX_USER_SEARCH_LENGTH } from "@repo/api/schemas/user";
import type { CosmoPublicUser } from "@repo/cosmo/types/user";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { truncateAddress } from "@/lib/address";
import { client } from "@/lib/orpc";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

const DEBOUNCE_MS = 350;

/** the Cosmo user search: the typed query, and the debounced one it fetches */
export function useUserSearch(initialQuery = "") {
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const debounce = useDebouncedCallback(setDebouncedQuery, DEBOUNCE_MS);
  const trimmed = debouncedQuery.trim();

  const { data, error, isFetching } = useQuery({
    queryKey: ["user-search", trimmed],
    queryFn: () => client.user.search({ query: trimmed }).then((res) => res.results),
    // the server refuses a longer query, and no nickname or address is that long
    enabled: trimmed.length > 0 && trimmed.length <= MAX_USER_SEARCH_LENGTH,
    retry: false,
  });

  // a rate limit is an answer, not a blank list: show what the server said
  const serverError = error instanceof ORPCError ? error.message : null;

  // the debounce wait counts as searching too, or the empty state flashes
  // "no users match" against every keystroke before the request even starts
  const searching = query.trim() !== "" && (query.trim() !== trimmed || isFetching);

  return {
    query,
    /** the debounced, trimmed query the results belong to */
    trimmed,
    results: data,
    serverError,
    searching,
    setQuery: (next: string) => {
      setQuery(next);
      debounce(next);
    },
    reset: () => {
      setQuery("");
      setDebouncedQuery("");
    },
  };
}

function UserAvatar({ image, label }: { image: string | undefined; label: string }) {
  return (
    <Avatar className="size-6.5 flex-none">
      {image && <AvatarImage src={image} alt="" />}
      <AvatarFallback>{label.slice(0, 1).toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}

/** avatar, nickname and short address in a 6.5 leading slot */
export function UserRowBody({ user }: { user: CosmoPublicUser }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <UserAvatar image={user.profileImageUrl} label={user.nickname} />
      <span className="flex-none truncate font-semibold">{user.nickname}</span>
      <span className="text-muted-foreground truncate font-mono text-xs">
        {truncateAddress(user.address)}
      </span>
    </span>
  );
}

/** nicknames vary in length and addresses do not, so only the name bars differ */
const NAME_WIDTHS = ["w-20", "w-14", "w-24", "w-16", "w-28"] as const;

/** the result rows' silhouette, so the list does not jump when they land */
function SearchingRows() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col p-2 text-left">
      <span className="sr-only">{m.nav_search_user_searching()}</span>
      {NAME_WIDTHS.map((width) => (
        <div key={width} aria-hidden className="flex items-center gap-2.5 px-2 py-1.5">
          <Skeleton className="size-6.5 flex-none rounded-full" />
          <Skeleton className={cn("h-3.5", width)} />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

/** a typed query with no rows: still searching, the server refusing, or nothing found */
export function UserSearchEmpty({
  searching,
  serverError,
  notFound,
}: {
  searching: boolean;
  serverError: string | null;
  notFound: { title: string; hint: string };
}) {
  if (searching) return <SearchingRows />;

  return (
    <EmptyState
      icon={UserIcon}
      title={serverError !== null ? m.nav_search_user_error() : notFound.title}
      hint={serverError ?? notFound.hint}
      bordered={false}
      className="py-8"
    />
  );
}
