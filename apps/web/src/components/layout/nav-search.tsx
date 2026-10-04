import { MagnifyingGlassIcon, TrashSimpleIcon } from "@phosphor-icons/react";
import type { CosmoPublicUser } from "@repo/cosmo/types/user";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";

import {
  Command,
  CommandCollection,
  CommandDialog,
  CommandDialogPopup,
  CommandDialogTrigger,
  CommandEmpty,
  CommandFooter,
  CommandGroup,
  CommandGroupLabel,
  CommandInput,
  CommandItem,
  CommandList,
  CommandPanel,
} from "@/components/ui/command";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { useUserSearchStore } from "@/features/user/search-store";
import { UserRowBody, UserSearchEmpty, useUserSearch } from "@/features/user/user-search";
import { truncateAddress } from "@/lib/address";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

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
  if (row.kind === "user") return <UserRowBody user={row.user} />;

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

/**
 * ⌘K user search on cnippet's Command (an inline Autocomplete in a dialog).
 * The server filters (`mode="none"`); the client only groups. A row acts from
 * its own `onClick`, which Enter on the highlighted row also fires.
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
  const search = useUserSearch();
  const { query, trimmed, results, serverError, searching } = search;
  const recent = useUserSearchStore((s) => s.users);
  const addRecent = useUserSearchStore((s) => s.add);
  const clearRecent = useUserSearchStore((s) => s.clearAll);
  const navigate = useNavigate();

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

    if (results && results.length > 0) {
      return [
        {
          value: m.nav_search_user_result_label(),
          items: results.map((user): Row => ({ kind: "user", key: user.address, user })),
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
  }, [trimmed, recent, results]);

  const pick = (row: Row) => {
    // clearing is not a navigation: the dialog stays open on the empty state
    if (row.kind === "clear") {
      clearRecent();
      search.reset();
      return;
    }
    if (row.kind === "user") addRecent(row.user);
    onOpenChange(false);
    search.reset();
    void navigate({
      to: "/@{$nickname}",
      params: { nickname: row.kind === "user" ? row.user.nickname : row.address },
    });
  };
  return (
    <CommandDialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) search.reset();
      }}
    >
      <CommandDialogTrigger
        /* below `md` it takes the room the nav links leave up to 176px, and the
           margin keeps the account menu at the far end; from `md` it is 240px
           and gives way before the links do; a phone has no ⌘K, and a narrow
           desktop row has no room for it */
        className="bg-background dark:bg-input/32 border-input text-muted-foreground hover:border-foreground/30 hover:text-foreground focus-visible:ring-ring flex h-8 max-w-44 min-w-0 flex-1 items-center gap-2 rounded-lg border ps-2.5 pe-1 text-sm shadow-xs/4 transition-colors duration-150 outline-none focus-visible:ring-2 max-md:mr-auto md:w-60 md:max-w-60 md:flex-initial"
      >
        <MagnifyingGlassIcon className="size-3.5 shrink-0" />
        <span className="flex-1 truncate text-left">{m.nav_search_user_label()}…</span>
        <KbdGroup className="shrink-0 gap-0.5 max-lg:hidden">
          <Kbd>⌘</Kbd>
          <Kbd className="aspect-square">K</Kbd>
        </KbdGroup>
      </CommandDialogTrigger>
      <CommandDialogPopup aria-label={m.nav_search_user_label()}>
        <Command
          mode="none"
          items={groups}
          value={query}
          onValueChange={(next, details) => {
            // picking a row writes its label into the input; the row acts instead
            if (details.reason !== "item-press") search.setQuery(next);
          }}
          // the wrapper drops Autocomplete's item generic, so the value arrives as unknown
          itemToStringValue={(row) => rowLabel(row as Row)}
        >
          <CommandInput placeholder={m.nav_search_user_placeholder()} />
          <CommandPanel>
            {/* nothing typed, searching, the server refusing, or nothing found;
                the searching rows bring the list's own padding */}
            <CommandEmpty className={cn(searching && "not-empty:p-0")}>
              {query.trim() === "" ? (
                m.nav_search_user_hint()
              ) : (
                <UserSearchEmpty
                  searching={searching}
                  serverError={serverError}
                  notFound={{
                    title: m.nav_search_user_empty(),
                    hint: m.nav_search_user_empty_hint({ query: query.trim() }),
                  }}
                />
              )}
            </CommandEmpty>
            <CommandList>
              {(group: Group) => (
                <CommandGroup key={group.value} items={group.items}>
                  <CommandGroupLabel>{group.value}</CommandGroupLabel>
                  <CommandCollection>
                    {(row: Row) => (
                      <CommandItem
                        key={row.key}
                        value={row}
                        onClick={() => pick(row)}
                        className={cn(row.kind === "clear" && "text-destructive-foreground")}
                      >
                        <RowBody row={row} />
                      </CommandItem>
                    )}
                  </CommandCollection>
                </CommandGroup>
              )}
            </CommandList>
          </CommandPanel>
          <CommandFooter>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd>
                <span>{m.nav_search_kbd_move()}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Kbd>↵</Kbd>
                <span>{m.nav_search_kbd_open()}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Kbd>esc</Kbd>
              <span>{m.nav_search_kbd_close()}</span>
            </div>
          </CommandFooter>
        </Command>
      </CommandDialogPopup>
    </CommandDialog>
  );
}
