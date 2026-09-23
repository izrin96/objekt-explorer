import { MagnifyingGlassIcon, TrashSimpleIcon, UserIcon } from "@phosphor-icons/react";
import type { CosmoPublicUser, CosmoSearchResult } from "@repo/cosmo/types/user";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { FetchError, ofetch } from "ofetch";
import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { Shimmer } from "@/components/shared/shimmer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Combobox,
  ComboboxCollection,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxGroupLabel,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Dialog, DialogPopup, DialogTitle } from "@/components/ui/dialog";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { useUserSearchStore } from "@/features/user/search-store";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { truncateAddress } from "@/lib/address";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

const DEBOUNCE_MS = 350;

/** a user row, the "open this raw address" escape hatch, or Recent's own clear */
type Row =
  | { kind: "user"; key: string; user: CosmoPublicUser }
  | { kind: "address"; key: string; address: string }
  | { kind: "clear"; key: string };

type Group = { value: string; items: Row[] };

const rowLabel = (r: Row) => {
  switch (r.kind) {
    case "user":
      return r.user.nickname;
    case "address":
      return r.address;
    case "clear":
      return m.nav_search_user_clear_history();
  }
};

/** every row is the same 6.5 leading slot plus its own line */
function RowBody({ row }: { row: Row }) {
  if (row.kind === "user") {
    return (
      <span className="flex min-w-0 items-center gap-2.5">
        <Avatar className="size-6.5 flex-none">
          {row.user.profileImageUrl && <AvatarImage src={row.user.profileImageUrl} alt="" />}
          <AvatarFallback>{row.user.nickname.slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className="flex-none truncate font-semibold">{row.user.nickname}</span>
        <span className="text-muted-foreground truncate font-mono text-xs">
          {truncateAddress(row.user.address)}
        </span>
      </span>
    );
  }

  if (row.kind === "address") {
    return (
      <span className="flex min-w-0 items-center gap-2.5">
        <span className="bg-secondary grid size-6.5 flex-none place-items-center rounded-full">
          <MagnifyingGlassIcon className="size-3.5" />
        </span>
        <span className="truncate">
          {m.nav_search_user_open_address()}{" "}
          <span className="font-mono text-xs">
            {row.address.length > 12 ? truncateAddress(row.address) : row.address}
          </span>
        </span>
      </span>
    );
  }

  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span className="grid size-6.5 flex-none place-items-center">
        <TrashSimpleIcon className="size-4" />
      </span>
      <span className="truncate">{m.nav_search_user_clear_history()}</span>
    </span>
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

/**
 * ⌘K user search: cnippet Combobox rendered inline inside a cnippet Dialog
 * (`inline` + `open`, so the list lives in the dialog instead of a popup).
 * Filtering is the server's (`filter={null}`) — the client only groups.
 *
 * Recent ends in a "Clear history" row. It is an item like any other — so the
 * arrow keys reach it and Enter fires it — but picking it is not a navigation:
 * it empties the list and leaves the dialog open on the instruction empty state.
 */
export function NavSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const recent = useUserSearchStore((s) => s.users);
  const addRecent = useUserSearchStore((s) => s.add);
  const clearRecent = useUserSearchStore((s) => s.clearAll);
  const navigate = useNavigate();

  const debounce = useDebouncedCallback(setDebouncedQuery, DEBOUNCE_MS);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

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

  const groups = useMemo<Group[]>(() => {
    if (trimmed === "") {
      if (recent.length === 0) return [];
      // the clear lives in the group it empties, so it disappears with it
      return [
        {
          value: m.nav_search_user_recent_label(),
          items: [
            ...recent.map((user): Row => ({ kind: "user", key: `recent-${user.address}`, user })),
            { kind: "clear", key: "clear" },
          ],
        },
      ];
    }

    if (data && data.length > 0) {
      return [
        {
          value: m.nav_search_user_result_label(),
          items: data.map((user): Row => ({ kind: "user", key: user.address, user })),
        },
      ];
    }

    if (trimmed.toLowerCase().startsWith("0x")) {
      return [
        {
          value: m.nav_search_user_address_label(),
          items: [{ kind: "address", key: "raw", address: trimmed }],
        },
      ];
    }

    return [];
  }, [trimmed, recent, data]);

  const setBothQueries = (next: string) => {
    setQuery(next);
    debounce(next);
  };

  const pick = (row: Row | null) => {
    if (!row) return;
    // clearing is not a navigation: the dialog stays open on the empty state
    if (row.kind === "clear") {
      clearRecent();
      setQuery("");
      setDebouncedQuery("");
      return;
    }
    if (row.kind === "user") addRecent(row.user);
    onOpenChange(false);
    setQuery("");
    setDebouncedQuery("");
    void navigate({
      to: "/@{$nickname}",
      params: { nickname: row.kind === "user" ? row.user.nickname : row.address },
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setQuery("");
          setDebouncedQuery("");
        }
      }}
    >
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        /* below `md` it takes the room the nav links leave up to 176px, and the
           margin keeps the account menu at the far end; from `md` it is 240px
           and gives way before the links do; a phone has no ⌘K, and a narrow
           desktop row has no room for it */
        className="bg-popover text-muted-foreground hover:border-foreground/30 flex h-8 max-w-44 min-w-0 flex-1 items-center gap-2 rounded-lg border px-2.5 text-sm max-md:mr-auto md:w-60 md:max-w-60 md:flex-initial"
      >
        <MagnifyingGlassIcon className="size-4 shrink-0" />
        <span className="truncate">{m.nav_search_user_label()}</span>
        <Kbd className="ml-auto shrink-0 max-lg:hidden">⌘K</Kbd>
      </button>
      <DialogPopup
        showCloseButton={false}
        bottomStickOnMobile={false}
        className="gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        <DialogTitle className="sr-only">{m.nav_search_user_label()}</DialogTitle>
        <Combobox<Row>
          inline
          open
          filter={null}
          items={groups}
          value={null}
          onValueChange={pick}
          inputValue={query}
          onInputValueChange={setBothQueries}
          itemToStringLabel={rowLabel}
          autoHighlight
        >
          <div className="p-2">
            <ComboboxInput
              autoFocus
              showTrigger={false}
              placeholder={m.nav_search_user_placeholder()}
              startAddon={<MagnifyingGlassIcon />}
              className="w-full"
            />
          </div>
          <div className="border-t" />
          {/* three different empties: nothing typed yet, the server refusing,
              and nothing found. Only the last is a result. */}
          <ComboboxEmpty className="text-muted-foreground text-center">
            {query.trim() === "" ? (
              <p className="px-3 py-8">{m.nav_search_user_hint()}</p>
            ) : searching ? (
              <SearchingRows />
            ) : serverError !== null ? (
              <EmptyState
                icon={UserIcon}
                title={m.nav_search_user_error()}
                hint={serverError}
                bordered={false}
                className="py-8"
              />
            ) : (
              <EmptyState
                icon={UserIcon}
                title={m.nav_search_user_empty()}
                hint={m.nav_search_user_empty_hint({ query: query.trim() })}
                bordered={false}
                className="py-8"
              />
            )}
          </ComboboxEmpty>
          <ComboboxList className="max-h-80">
            {(group: Group) => (
              <ComboboxGroup key={group.value} items={group.items}>
                <ComboboxGroupLabel>{group.value}</ComboboxGroupLabel>
                <ComboboxCollection>
                  {(row: Row) => (
                    <ComboboxItem
                      key={row.key}
                      value={row}
                      className={cn(
                        "grid-cols-1 gap-0 px-2 py-1.5 [&>div]:col-start-1",
                        row.kind === "clear" && "text-destructive-foreground",
                      )}
                    >
                      <RowBody row={row} />
                    </ComboboxItem>
                  )}
                </ComboboxCollection>
              </ComboboxGroup>
            )}
          </ComboboxList>
          <div className="text-muted-foreground bg-muted/40 flex items-center gap-3 border-t px-3 py-2 text-xs">
            <KbdGroup>
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd>
              {m.nav_search_kbd_move()}
            </KbdGroup>
            <KbdGroup>
              <Kbd>↵</Kbd>
              {m.nav_search_kbd_open()}
            </KbdGroup>
            <KbdGroup>
              <Kbd>esc</Kbd>
              {m.nav_search_kbd_close()}
            </KbdGroup>
          </div>
        </Combobox>
      </DialogPopup>
    </Dialog>
  );
}
