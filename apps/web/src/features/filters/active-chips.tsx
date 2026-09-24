import { XIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArtistAvatar } from "@/features/artist/artist-avatar";
import { useCosmoArtist } from "@/features/artist/cosmo-artist-provider";
import { cn, scrollXOnlyClass } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { EDITION_LABEL, GROUP_BY_LABEL, ONLINE_TYPE_LABEL, SORT_LABEL } from "./labels";
import { useMemberColor } from "./member-colors";
import type { FilterSearch } from "./search-schema";
import { useCanonicalFilters, type FilterPatch } from "./use-filters";

export type ActiveChip = {
  key: string;
  /** accessible name; the chip shows `value` instead, after `name` when there is one */
  label: string;
  value?: string;
  name?: string;
  dot?: string;
  artistId?: string;
  /** sets `value` in mono: objekt data, not prose */
  mono?: boolean;
  remove: FilterPatch;
};

function without<T>(values: readonly T[], value: T): T[] | undefined {
  const next = values.filter((item) => item !== value);
  return next.length > 0 ? next : undefined;
}

export function useActiveChips(): ActiveChip[] {
  const filters = useCanonicalFilters();
  const memberColor = useMemberColor();
  return buildChips(filters, memberColor);
}

function buildChips(filters: FilterSearch, memberColor: (name: string) => string): ActiveChip[] {
  const chips: ActiveChip[] = [];

  for (const value of filters.artist ?? []) {
    chips.push({
      key: `artist:${value}`,
      label: `${m.filter_artist()}: ${value}`,
      value,
      artistId: value,
      remove: { artist: without(filters.artist ?? [], value) },
    });
  }
  for (const value of filters.member ?? []) {
    chips.push({
      key: `member:${value}`,
      label: `${m.filter_member()}: ${value}`,
      value,
      dot: memberColor(value),
      remove: { member: without(filters.member ?? [], value) },
    });
  }
  for (const value of filters.season ?? []) {
    chips.push({
      key: `season:${value}`,
      label: `${m.filter_season()}: ${value}`,
      remove: { season: without(filters.season ?? [], value) },
    });
  }
  for (const value of filters.class ?? []) {
    chips.push({
      key: `class:${value}`,
      label: `${m.filter_class()}: ${value}`,
      remove: { class: without(filters.class ?? [], value) },
    });
  }
  for (const value of filters.collection ?? []) {
    chips.push({
      key: `collection:${value}`,
      label: `${m.filter_collection_no()}: ${value}`,
      name: m.filter_collection_no(),
      value,
      mono: true,
      remove: { collection: without(filters.collection ?? [], value) },
    });
  }
  for (const value of filters.on_offline ?? []) {
    chips.push({
      key: `on_offline:${value}`,
      label: `${m.filter_type()}: ${ONLINE_TYPE_LABEL[value]()}`,
      remove: { on_offline: without(filters.on_offline ?? [], value) },
    });
  }
  for (const value of filters.edition ?? []) {
    chips.push({
      key: `edition:${value}`,
      label: `${m.filter_edition()}: ${EDITION_LABEL[value]}`,
      remove: { edition: without(filters.edition ?? [], value) },
    });
  }
  if (filters.transferable === true) {
    chips.push({
      key: "transferable",
      label: m.filter_transferable(),
      remove: { transferable: undefined },
    });
  }
  if (filters.grouped === true) {
    chips.push({ key: "grouped", label: m.filter_combine(), remove: { grouped: undefined } });
  }
  if (filters.hidePin === true) {
    chips.push({ key: "hidePin", label: m.filter_disable_pin(), remove: { hidePin: undefined } });
  }
  if (filters.locked !== undefined) {
    chips.push({
      key: "locked",
      label: filters.locked ? m.filter_only_locked() : m.filter_only_unlocked(),
      remove: { locked: undefined },
    });
  }
  if (filters.priced === true) {
    chips.push({ key: "priced", label: m.filter_priced_only(), remove: { priced: undefined } });
  }
  if (filters.missing === true || filters.unowned === true) {
    chips.push({
      key: "missing",
      label: m.filter_show_missing(),
      remove: { missing: undefined, unowned: undefined },
    });
  }
  if (filters.color !== undefined) {
    chips.push({
      key: `color:${filters.color}`,
      label: `${m.filter_color()}: ${filters.color}`,
      value: filters.color,
      dot: filters.color,
      mono: true,
      // the sensitivity has no meaning without a colour, so one chip drops both
      remove: { color: undefined, colorSensitivity: undefined },
    });
  }
  if (filters.floor_min !== undefined || filters.floor_max !== undefined) {
    const floor = `${filters.floor_min ?? "…"}–${filters.floor_max ?? "…"}`;
    chips.push({
      key: "floor",
      label: `${m.filter_floor_price()}: ${floor}`,
      name: m.filter_floor_price(),
      value: floor,
      mono: true,
      remove: { floor_min: undefined, floor_max: undefined },
    });
  }
  if (filters.search !== undefined) {
    chips.push({
      key: "search",
      label: `${m.common_search_aria()}: ${filters.search}`,
      remove: { search: undefined },
    });
  }
  if (filters.sort !== undefined) {
    chips.push({
      key: "sort",
      label: `${m.filter_sort_by_label()}: ${SORT_LABEL[filters.sort]()}`,
      // the direction is a property of the sort, so it leaves with it
      remove: { sort: undefined, sort_dir: undefined },
    });
  }
  if (filters.group_by !== undefined) {
    chips.push({
      key: "group_by",
      label: `${m.filter_group_by_label()}: ${GROUP_BY_LABEL[filters.group_by]()}`,
      remove: { group_by: undefined, group_dir: undefined },
    });
  }

  return chips;
}

export function ActiveChips({
  chips,
  onRemove,
  onReset,
}: {
  chips: readonly ActiveChip[];
  onRemove: (chip: ActiveChip) => void;
  onReset: () => void;
}) {
  const { getArtist } = useCosmoArtist();
  if (chips.length === 0) return null;

  return (
    <ScrollArea data-scroll-x scrollFade className={scrollXOnlyClass}>
      <div className="flex w-max items-center gap-1.5 pb-0.5">
        {chips.map((chip) => {
          const artist = chip.artistId !== undefined ? getArtist(chip.artistId) : undefined;
          const swatched = artist !== undefined || chip.dot !== undefined;
          return (
            <button
              key={chip.key}
              type="button"
              aria-label={m.filter_remove_chip({ label: chip.label })}
              onClick={() => onRemove(chip)}
              className="bg-secondary hover:bg-muted inline-flex h-6.5 flex-none cursor-pointer items-center gap-1.5 rounded-full pr-2 pl-2.5 text-xs whitespace-nowrap data-swatched:pl-1"
              data-swatched={swatched || undefined}
            >
              {artist !== undefined && <ArtistAvatar artist={artist} className="size-4 ring-0" />}
              {chip.dot !== undefined && (
                <span
                  className="ring-foreground/15 size-4.5 rounded-full ring-1"
                  style={{ background: chip.dot }}
                />
              )}
              {chip.value === undefined ? (
                chip.label
              ) : (
                <span>
                  {chip.name !== undefined && `${chip.name}: `}
                  <span className={cn(chip.mono && "font-mono")}>{chip.value}</span>
                </span>
              )}
              <XIcon className="size-3 opacity-50" />
            </button>
          );
        })}
        <Button variant="outline" size="xs" onClick={onReset} className="h-6.5 flex-none sm:h-6.5">
          {m.filter_clear_all()}
        </Button>
      </div>
    </ScrollArea>
  );
}
