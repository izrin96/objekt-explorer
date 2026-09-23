import { MagnifyingGlassIcon, TrashSimpleIcon, UserIcon } from "@phosphor-icons/react";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { avatarGradient, users, type LabUser } from "@/fixtures/users";
import { truncateAddress } from "@/lib/address";
import { readStringArray, writeStringArray } from "@/lib/local-storage";
import { cn } from "@/lib/utils";

const RECENT_KEY = "lab:recent-users";
const RECENT_MAX = 5;

/** a blocked or hand-edited key reads as no recents, not as a half-valid list */
const readRecent = (): string[] => readStringArray(RECENT_KEY) ?? [];

/** a user row, the "open this raw address" escape hatch, or Recent's own clear */
type Row =
  | { kind: "user"; key: string; user: LabUser }
  | { kind: "address"; key: string; address: string }
  | { kind: "clear"; key: string };

type Group = { value: string; items: Row[] };

const CLEAR_LABEL = "Clear history";

const rowLabel = (r: Row) => {
  switch (r.kind) {
    case "user":
      return r.user.nickname;
    case "address":
      return r.address;
    case "clear":
      return CLEAR_LABEL;
  }
};

function matches(query: string): LabUser[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return users.filter(
    (u) => u.nickname.toLowerCase().includes(q) || u.address.toLowerCase().startsWith(q),
  );
}

/** every row is the same 6.5 leading slot plus its own line */
function RowBody({ row }: { row: Row }) {
  if (row.kind === "user") {
    return (
      <span className="flex min-w-0 items-center gap-2.5">
        <Avatar className="size-6.5 flex-none">
          <AvatarFallback style={{ background: avatarGradient(row.user.avatarHue) }} />
        </Avatar>
        <span className="flex-none truncate font-semibold">{row.user.nickname}</span>
        <span className="text-muted-foreground truncate font-mono text-xs">
          {truncateAddress(row.user.address)}
        </span>
        {row.user.verified && (
          <Badge size="sm" variant="info" className="ml-auto flex-none">
            Verified
          </Badge>
        )}
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
          Open address{" "}
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
      <span className="truncate">{CLEAR_LABEL}</span>
    </span>
  );
}

/**
 * ⌘K user search: cnippet Combobox rendered inline inside a cnippet Dialog
 * (`inline` + `open`, so the list lives in the dialog instead of a popup).
 * Filtering is ours (`filter={null}`) because of the Recent group and the
 * raw-address row.
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
  const [recent, setRecent] = useState<string[]>(readRecent);
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
    const q = query.trim();
    if (!q) {
      const items = recent
        .map((address) => users.find((u) => u.address === address))
        .filter((u): u is LabUser => u !== undefined)
        .map((user): Row => ({ kind: "user", key: `recent-${user.address}`, user }));
      if (items.length === 0) return [];
      // the clear lives in the group it empties, so it disappears with it
      return [{ value: "Recent", items: [...items, { kind: "clear", key: "clear" }] }];
    }

    const found = matches(q);
    if (found.length > 0) {
      return [
        {
          value: "Users",
          items: found.map((user): Row => ({ kind: "user", key: user.address, user })),
        },
      ];
    }
    if (q.toLowerCase().startsWith("0x")) {
      return [{ value: "Address", items: [{ kind: "address", key: "raw", address: q }] }];
    }
    return [];
  }, [query, recent]);

  const pick = (row: Row | null) => {
    if (!row) return;
    // clearing is not a navigation: the dialog stays open on the empty state
    if (row.kind === "clear") {
      setRecent([]);
      writeStringArray(RECENT_KEY, []);
      setQuery("");
      return;
    }
    if (row.kind === "user") {
      const next = [row.user.address, ...recent.filter((a) => a !== row.user.address)].slice(
        0,
        RECENT_MAX,
      );
      setRecent(next);
      writeStringArray(RECENT_KEY, next);
    }
    onOpenChange(false);
    setQuery("");
    void navigate({
      to: "/profile/$nickname",
      params: { nickname: row.kind === "user" ? row.user.nickname : row.address },
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setQuery("");
      }}
    >
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="bg-popover text-muted-foreground hover:border-foreground/30 hidden h-8 w-60 min-w-0 items-center gap-2 rounded-lg border px-2.5 text-[13px] md:flex"
      >
        <MagnifyingGlassIcon className="size-4 shrink-0" />
        <span className="truncate">Search user</span>
        <Kbd className="ml-auto shrink-0">⌘K</Kbd>
      </button>
      <DialogPopup
        showCloseButton={false}
        bottomStickOnMobile={false}
        className="gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        <DialogTitle className="sr-only">Search user</DialogTitle>
        <Combobox<Row>
          inline
          open
          filter={null}
          items={groups}
          value={null}
          onValueChange={pick}
          inputValue={query}
          onInputValueChange={setQuery}
          itemToStringLabel={rowLabel}
          autoHighlight
        >
          <div className="p-2">
            <ComboboxInput
              autoFocus
              showTrigger={false}
              placeholder="Search by nickname or 0x address…"
              startAddon={<MagnifyingGlassIcon />}
              className="w-full"
            />
          </div>
          <div className="border-t" />
          {/* two different empties: nothing typed yet, and nothing found.
              The first is an instruction, the second is a result. */}
          <ComboboxEmpty className="text-muted-foreground text-center text-[13px]">
            {query.trim() === "" ? (
              <p className="px-3 py-8">Search by nickname or 0x address</p>
            ) : (
              <EmptyState
                icon={UserIcon}
                title="No users match"
                hint={`Nothing in the directory is called “${query.trim()}”. A full 0x address opens as a profile even when it is not listed.`}
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
          <div className="text-muted-foreground bg-muted/40 flex items-center gap-3 border-t px-3 py-2 text-[11.5px]">
            <KbdGroup>
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd>
              to move
            </KbdGroup>
            <KbdGroup>
              <Kbd>↵</Kbd>
              open
            </KbdGroup>
            <KbdGroup>
              <Kbd>esc</Kbd>
              close
            </KbdGroup>
          </div>
        </Combobox>
      </DialogPopup>
    </Dialog>
  );
}
