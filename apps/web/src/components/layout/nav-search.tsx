import { MagnifyingGlassIcon, TrashSimpleIcon } from "@phosphor-icons/react";
import type { CosmoPublicUser } from "@repo/cosmo/types/user";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";

import {
  Combobox,
  ComboboxCollection,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxGroupLabel,
  ComboboxInput,
  ComboboxList,
} from "@/components/ui/combobox";
import { Dialog, DialogPopup, DialogTitle } from "@/components/ui/dialog";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { useUserSearchStore } from "@/features/user/search-store";
import {
  UserRowBody,
  UserSearchEmpty,
  UserSearchItem,
  useUserSearch,
} from "@/features/user/user-search";
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

  const pick = (row: Row | null) => {
    if (!row) return;
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
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          search.reset();
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
          onInputValueChange={search.setQuery}
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
          </ComboboxEmpty>
          <ComboboxList className="max-h-80">
            {(group: Group) => (
              <ComboboxGroup key={group.value} items={group.items}>
                <ComboboxGroupLabel>{group.value}</ComboboxGroupLabel>
                <ComboboxCollection>
                  {(row: Row) => (
                    <UserSearchItem
                      key={row.key}
                      value={row}
                      className={cn(row.kind === "clear" && "text-destructive-foreground")}
                    >
                      <RowBody row={row} />
                    </UserSearchItem>
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
