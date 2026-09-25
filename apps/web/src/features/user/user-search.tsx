import { UserIcon } from "@phosphor-icons/react";
import type { CosmoPublicUser, CosmoSearchResult } from "@repo/cosmo/types/user";
import { useQuery } from "@tanstack/react-query";
import { FetchError, ofetch } from "ofetch";
import { type ComponentProps, type KeyboardEvent, useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { Shimmer } from "@/components/shared/shimmer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ComboboxItem } from "@/components/ui/combobox";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { truncateAddress } from "@/lib/address";
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
    queryFn: () =>
      ofetch<CosmoSearchResult>("/api/user/search", { query: { query: trimmed } }).then(
        (res) => res.results,
      ),
    enabled: trimmed.length > 0,
    retry: false,
  });

  // a rate limit is an answer, not a blank list: show what the server said
  const serverError =
    error instanceof FetchError
      ? ((error.data as { error?: string } | undefined)?.error ?? error.message)
      : null;

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

/**
 * Base UI highlights the first row on the keystroke, before the server's rows
 * exist, and not again when they land. Its `autoHighlight: "always"` would, but
 * Combobox does not take it (Autocomplete only, as of 1.8); delete this once it
 * does. Until a row is highlighted, the typed query's first row stands in: it is
 * drawn highlighted and Enter picks it.
 */
export function useFirstRowStandIn<Row>({
  search,
  rows,
  pick,
}: {
  search: Pick<ReturnType<typeof useUserSearch>, "query" | "trimmed">;
  rows: readonly Row[];
  pick: (row: Row) => void;
}) {
  const [highlighted, setHighlighted] = useState(false);
  // until the debounce settles the rows are the last query's
  const current = search.trimmed !== "" && search.query.trim() === search.trimmed;
  const standIn = current && !highlighted ? rows[0] : undefined;

  return {
    onItemHighlighted: (row: Row | undefined) => setHighlighted(row !== undefined),
    onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
      // an IME's Enter confirms the character being composed
      if (event.key !== "Enter" || event.nativeEvent.isComposing || standIn === undefined) return;
      event.preventDefault();
      pick(standIn);
    },
    isStandIn: (row: Row) => row === standIn,
    /** a remounted Combobox never reports that its last highlight went away */
    reset: () => setHighlighted(false),
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

/** a result row without the kit's check-mark column: picking one acts, it never stays selected */
export function UserSearchItem({
  standIn = false,
  className,
  ...props
}: ComponentProps<typeof ComboboxItem> & { standIn?: boolean }) {
  return (
    <ComboboxItem
      className={cn(
        "grid-cols-1 gap-0 px-2 py-1.5 [&>div]:col-start-1",
        standIn && "bg-accent text-accent-foreground",
        className,
      )}
      {...props}
    />
  );
}

/** the result rows' silhouette, so the list does not jump when they land */
function SearchingRows() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-1 p-2 text-left">
      <span className="sr-only">{m.nav_search_user_searching()}</span>
      {[0, 1, 2].map((i) => (
        <span key={i} aria-hidden className="flex items-center gap-2.5 px-2 py-1.5">
          <Shimmer className="size-6.5 flex-none rounded-full" />
          <Shimmer className="h-3.5 w-24" />
          <Shimmer className="h-3 w-20" />
        </span>
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
