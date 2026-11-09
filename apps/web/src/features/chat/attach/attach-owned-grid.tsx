import { CardsThreeIcon } from "@phosphor-icons/react";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import type { Attachment } from "@/features/chat/attachment";
import { filterObjekts } from "@/features/filters/filter-utils";
import {
  type PickerFacetFilters,
  pickerFiltered,
  toFilterSearch,
} from "@/features/filters/picker-filter-bar";
import { CardGridSkeleton } from "@/features/objekt/card-grid";
import { ObjektCard } from "@/features/objekt/objekt-card";
import { isObjektOwned } from "@/features/objekt/objekt-utils";
import { VirtualCardGrid } from "@/features/objekt/virtual-card-grid";
import { ownedCollectionOptions } from "@/features/profile/queries";
import { useLoadAllPages } from "@/hooks/use-load-all-pages";
import { m } from "@/paraglide/messages";

import { LoadError } from "./attach-picker-parts";

/**
 * What a profile holds, one card per copy, for a picker sheet: chat's attach and the Trade
 * composer each supply the tile and the wording.
 */
export function OwnedObjektsGrid({
  address,
  filters,
  emptyTitle,
  noMatchTitle,
  renderItem,
}: {
  address: string;
  filters: PickerFacetFilters;
  emptyTitle: string;
  noMatchTitle: string;
  renderItem: (objekt: ValidObjekt) => ReactNode;
}) {
  // a failed read shows in the sheet, not the page's error boundary
  const query = useInfiniteQuery({ ...ownedCollectionOptions(address), throwOnError: false });
  // the filters run in the browser, so they need every page
  const filtering = pickerFiltered(filters);
  useLoadAllPages(filtering, query);

  if (query.isPending) return <CardGridSkeleton />;
  const all = query.data?.pages.flatMap((page) => page.objekts) ?? [];
  if (all.length === 0) {
    if (query.isError) return <LoadError onRetry={() => void query.refetch()} />;
    return <EmptyState icon={CardsThreeIcon} bordered={false} title={emptyTitle} />;
  }
  const objekts = filtering ? filterObjekts(toFilterSearch(filters), all) : all;
  if (objekts.length === 0 && !query.hasNextPage) {
    return <EmptyState icon={CardsThreeIcon} bordered={false} title={noMatchTitle} />;
  }

  return (
    <VirtualCardGrid
      sections={[{ title: null, items: objekts }]}
      getKey={(objekt) => objekt.id}
      more={{
        has: query.hasNextPage,
        loading: query.isFetchingNextPage,
        failed: query.isFetchNextPageError,
        load: () => void query.fetchNextPage({ cancelRefetch: false }),
      }}
      renderItem={renderItem}
    />
  );
}

export function OwnedGrid({
  address,
  filters,
  onPick,
}: {
  address: string;
  filters: PickerFacetFilters;
  onPick: (attachment: Attachment) => void;
}) {
  return (
    <OwnedObjektsGrid
      address={address}
      filters={filters}
      emptyTitle={m.chat_attach_no_objekts()}
      noMatchTitle={m.chat_attach_no_match()}
      renderItem={(objekt) => (
        <ObjektCard
          objekt={objekt}
          image="thumbnail"
          description={m.chat_attach_title()}
          onOpen={() =>
            onPick({
              kind: "objekt",
              input: {
                kind: "objekt",
                collectionSlug: objekt.slug,
                objektId: isObjektOwned(objekt) ? objekt.id : undefined,
              },
              objekt,
              listName: null,
            })
          }
        />
      )}
    />
  );
}
