import { CardsThreeIcon } from "@phosphor-icons/react";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { EmptyState } from "@/components/shared/empty-state";
import { useCosmoArtist } from "@/features/artist/cosmo-artist-provider";
import { LoadError } from "@/features/chat/attach/attach-picker-parts";
import { filterObjekts } from "@/features/filters/filter-utils";
import {
  type PickerFacetFilters,
  pickerFiltered,
  toFilterSearch,
} from "@/features/filters/picker-filter-bar";
import { CardGridSkeleton } from "@/features/objekt/card-grid";
import { ObjektCard } from "@/features/objekt/objekt-card";
import { collectionOptions } from "@/features/objekt/queries";
import { SelectedMark } from "@/features/objekt/selected-mark";
import { VirtualCardGrid } from "@/features/objekt/virtual-card-grid";
import { ownedCollectionOptions } from "@/features/profile/queries";
import { useLoadAllPages } from "@/hooks/use-load-all-pages";
import { activateOnKey } from "@/lib/a11y";
import { m } from "@/paraglide/messages";

export type Ticked = ReadonlyMap<string, ValidObjekt>;

export type GridProps = {
  filters: PickerFacetFilters;
  ticked: Ticked;
  onToggle: (key: string, objekt: ValidObjekt) => void;
};

/** What the bound profile holds, one card per copy, keyed by token id. */
export function OwnedGrid({ address, filters, ticked, onToggle }: GridProps & { address: string }) {
  // a failed read shows in the sheet, not the page's error boundary
  const query = useInfiniteQuery({ ...ownedCollectionOptions(address), throwOnError: false });
  // the filters run in the browser, so they need every page
  const filtering = pickerFiltered(filters);
  useLoadAllPages(filtering, query);

  if (query.isPending) return <CardGridSkeleton />;
  const all = query.data?.pages.flatMap((page) => page.objekts) ?? [];
  if (all.length === 0) {
    if (query.isError) return <LoadError onRetry={() => void query.refetch()} />;
    return (
      <EmptyState
        icon={CardsThreeIcon}
        bordered={false}
        title={m.trade_composer_add_no_objekts()}
      />
    );
  }
  const rows = filtering ? filterObjekts(toFilterSearch(filters), all) : all;
  if (rows.length === 0 && !query.hasNextPage) return <NoMatch />;

  return (
    <VirtualCardGrid
      sections={[{ title: null, items: rows }]}
      getKey={(objekt) => objekt.id}
      more={{
        has: query.hasNextPage,
        loading: query.isFetchingNextPage,
        failed: query.isFetchNextPageError,
        load: () => void query.fetchNextPage({ cancelRefetch: false }),
      }}
      renderItem={(objekt) => (
        <TickTile
          objekt={objekt}
          ticked={ticked.has(objekt.id)}
          onToggle={() => onToggle(objekt.id, objekt)}
        />
      )}
    />
  );
}

/** Every collection of the selected artists, as the index has them, keyed by slug. */
export function CollectionGrid({ filters, ticked, onToggle }: GridProps) {
  const { selectedArtistIds } = useCosmoArtist();
  // the option throws to the page's error boundary, which a sheet must not take down
  const query = useQuery({
    ...collectionOptions({ artist: selectedArtistIds }),
    throwOnError: false,
  });

  if (query.isPending) return <CardGridSkeleton />;
  if (query.isError) return <LoadError onRetry={() => void query.refetch()} />;
  const all = query.data;
  if (all.length === 0) {
    return (
      <EmptyState
        icon={CardsThreeIcon}
        bordered={false}
        title={m.trade_composer_add_no_collections()}
      />
    );
  }
  const rows = pickerFiltered(filters) ? filterObjekts(toFilterSearch(filters), all) : all;
  if (rows.length === 0) return <NoMatch />;

  return (
    <VirtualCardGrid
      sections={[{ title: null, items: rows }]}
      getKey={(objekt) => objekt.slug}
      renderItem={(objekt) => (
        <TickTile
          objekt={objekt}
          ticked={ticked.has(objekt.slug)}
          onToggle={() => onToggle(objekt.slug, objekt)}
        />
      )}
    />
  );
}

/** A tile ticks as the offer picker's do, never with the collection's indigo selection ring. */
function TickTile({
  objekt,
  ticked,
  onToggle,
}: {
  objekt: ValidObjekt;
  ticked: boolean;
  onToggle: () => void;
}) {
  // not a `<button>`: WebKit collapses the card's `aspect-ratio` box inside one
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={ticked}
      onClick={onToggle}
      onKeyDown={(event) => activateOnKey(event, onToggle)}
      className="focus-visible:ring-ring @container relative cursor-pointer rounded-md outline-none focus-visible:ring-2"
    >
      <ObjektCard objekt={objekt} image="thumbnail" />
      {ticked ? <SelectedMark /> : null}
    </div>
  );
}

function NoMatch() {
  return (
    <EmptyState icon={CardsThreeIcon} bordered={false} title={m.trade_composer_add_no_match()} />
  );
}
