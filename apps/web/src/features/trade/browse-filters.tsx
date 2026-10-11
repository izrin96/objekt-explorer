import { type ValidOnlineType, validArtists } from "@repo/cosmo/types/common";
import { useMemo } from "react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useCosmoArtist } from "@/features/artist/cosmo-artist-provider";
import { ActiveChips, type ActiveChip, useActiveChips } from "@/features/filters/active-chips";
import {
  type ExtraFacet,
  ExtraFacetControls,
  FACET_KEYS,
  FacetControls,
  type FacetKey,
  useDeclaredFacets,
  useFacetParity,
} from "@/features/filters/facet-controls";
import { useScopedFacets } from "@/features/filters/facets";
import { QuickFilters } from "@/features/filters/filter-bar";
import { FilterSheet } from "@/features/filters/filter-sheet";
import { ONLINE_TYPE_LABEL } from "@/features/filters/labels";
import { OnlineFilter } from "@/features/filters/online-filter";
import { ResetButton } from "@/features/filters/reset-button";
import { useCanonicalFilters, useSetFilters } from "@/features/filters/use-filters";
import { m } from "@/paraglide/messages";

import type { BrowseSearch } from "./browse-search";

/** artist has its own row of toggles above the shared facets */
const BROWSE_FACET_KEYS = FACET_KEYS.filter((key) => key !== "artist");

const ALL = "all";

/** "Type" would sit right above the post-type tabs, so the online/offline filter is renamed here */
function FormatFilter({ className }: { className?: string }) {
  return <OnlineFilter className={className} label={m.trade_filter_format()} />;
}

function ArtistToggles() {
  const { facets } = useScopedFacets();
  const { getArtist } = useCosmoArtist();
  const chosen = useCanonicalFilters().artist;
  const setFilters = useSetFilters();

  if (facets.artists.length < 2) return null;

  const pressed = (chosen ?? []).filter((id) => facets.artists.includes(id));
  const value = pressed.length > 0 ? pressed : [ALL];

  const change = (next: string[]) => {
    const artist = next.includes(ALL) && pressed.length > 0 ? [] : next.filter((id) => id !== ALL);
    setFilters({
      artist: artist.length > 0 ? validArtists.filter((id) => artist.includes(id)) : undefined,
    });
  };

  return (
    <ToggleGroup
      multiple
      variant="outline"
      value={value}
      onValueChange={change}
      aria-label={m.filter_artist()}
      className="flex-wrap"
    >
      <ToggleGroupItem value={ALL}>{m.filter_all()}</ToggleGroupItem>
      {facets.artists.map((id) => (
        <ToggleGroupItem key={id} value={id}>
          {getArtist(id)?.title ?? id}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

export function BrowseFilters({
  search,
  slugName,
  filtering,
  onClearSlug,
  onReset,
}: {
  search: BrowseSearch;
  slugName: string | undefined;
  filtering: boolean;
  onClearSlug: () => void;
  onReset: () => void;
}) {
  const { facets, groups } = useScopedFacets();
  const filters = useCanonicalFilters();
  const setFilters = useSetFilters();
  const chips = useActiveChips().map((chip): ActiveChip => {
    if (!chip.key.startsWith("on_offline:")) return chip;
    const value = chip.key.slice("on_offline:".length) as ValidOnlineType;
    return {
      key: chip.key,
      label: `${m.trade_filter_format()}: ${ONLINE_TYPE_LABEL[value]()}`,
      remove: chip.remove,
    };
  });

  const setFacet = (key: FacetKey, value: string[]) =>
    setFilters({ [key]: value.length > 0 ? value : undefined });

  const values = {
    artist: filters.artist ?? [],
    member: filters.member ?? [],
    season: filters.season ?? [],
    class: filters.class ?? [],
    collection: filters.collection ?? [],
  };

  const extras = useMemo<ExtraFacet[]>(
    () => [
      { key: "on_offline", active: (filters.on_offline?.length ?? 0) > 0, Control: FormatFilter },
    ],
    [filters.on_offline],
  );

  const declaredKeys = useMemo(() => [...BROWSE_FACET_KEYS, ...extras.map((e) => e.key)], [extras]);
  useDeclaredFacets("inline", declaredKeys);
  useFacetParity();

  const nothingToReset = !filtering;

  const slugChip: ActiveChip[] =
    search.slug && slugName
      ? [
          {
            key: "slug",
            label: `${m.trade_collection_chip()}: ${slugName}`,
            name: m.trade_collection_chip(),
            value: slugName,
            mono: slugName === search.slug,
            remove: {},
          },
        ]
      : [];

  return (
    <>
      <ArtistToggles />
      <div className="flex flex-wrap items-center gap-2">
        <QuickFilters>
          <FilterSheet
            facets={facets}
            groups={groups}
            values={values}
            onChange={setFacet}
            keys={BROWSE_FACET_KEYS}
            extras={extras}
            onReset={onReset}
            resetDisabled={nothingToReset}
          />
          <ExtraFacetControls surface="inline" extras={extras} />
          <FacetControls
            surface="inline"
            facets={facets}
            groups={groups}
            values={values}
            onChange={setFacet}
            keys={BROWSE_FACET_KEYS}
          />
          <ResetButton onReset={onReset} disabled={nothingToReset} />
        </QuickFilters>
      </div>

      <ActiveChips
        chips={[...slugChip, ...chips]}
        onRemove={(chip) => (chip.key === "slug" ? onClearSlug() : setFilters(chip.remove))}
      />
    </>
  );
}
