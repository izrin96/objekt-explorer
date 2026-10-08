import { ArrowClockwiseIcon, CardsThreeIcon, WarningIcon } from "@phosphor-icons/react";
import type { CandidateItem } from "@repo/api/schemas/offer";
import type { GridObjekt } from "@repo/lib/types/objekt";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { searchMatcher } from "@/features/filters/filter-utils";
import { mapObjektWithTag } from "@/features/objekt/objekt-utils";
import { PhotocardSkeleton } from "@/features/objekt/photocard-skeleton";
import { VirtualCardGrid } from "@/features/objekt/virtual-card-grid";
import { m } from "@/paraglide/messages";

import { CandidateTile } from "./candidate-tile";
import { type Collections, pickKey } from "./pick";
import { offerRefusalOf, offerRefusalText } from "./refusal";

/**
 * The quick search over loaded candidates; the facets narrow on the server, but the search
 * reads collection tags the endpoint does not carry, so the caller pages everything in.
 */
export function candidateMatcher(search: string, collections: Collections) {
  const matches = searchMatcher(search);
  if (!matches) return null;
  const tagged = new Map<string, GridObjekt>();
  return (item: CandidateItem) => {
    const collection = collections[item.collectionSlug];
    if (!collection) return false;
    let objekt = tagged.get(item.collectionSlug);
    if (!objekt) {
      objekt = mapObjektWithTag(collection);
      tagged.set(item.collectionSlug, objekt);
    }
    // a serial term only reads an objekt that has one
    return matches(item.serial === null ? objekt : { ...objekt, serial: item.serial });
  };
}

function loadError(error: unknown, refetch: () => Promise<unknown>) {
  const refusal = offerRefusalOf(error);
  return {
    retry: () => void refetch(),
    text: refusal ? (offerRefusalText(refusal, m.offer_refused_some()) ?? null) : null,
  };
}

export function CandidateGrid({
  sections,
  collections,
  pending,
  error,
  empty,
  more,
  isSelected,
  full,
  onToggle,
}: {
  sections: { title: string | null; items: CandidateItem[] }[];
  collections: Collections;
  pending: boolean;
  error: { retry: () => void; text: string | null } | null;
  empty: { title: string; hint?: string };
  more?: { has: boolean; loading: boolean; failed: boolean; load: () => void };
  isSelected: (item: CandidateItem) => boolean;
  full: boolean;
  onToggle: (item: CandidateItem, collections: Collections) => void;
}) {
  if (pending) {
    return (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <PhotocardSkeleton key={i} />
        ))}
      </div>
    );
  }
  if (error) {
    if (error.text) {
      return (
        <p role="alert" className="text-sm text-pretty">
          {error.text}
        </p>
      );
    }
    return (
      <EmptyState
        icon={WarningIcon}
        bordered={false}
        title={m.common_error_loading_data()}
        action={
          <Button variant="outline" size="sm" onClick={error.retry}>
            <ArrowClockwiseIcon />
            {m.common_error_retry()}
          </Button>
        }
      />
    );
  }
  // a search still paging in has nothing to show yet, not nothing at all
  if (sections.every((section) => section.items.length === 0) && !more?.has) {
    return (
      <EmptyState icon={CardsThreeIcon} bordered={false} title={empty.title} hint={empty.hint} />
    );
  }

  return (
    <VirtualCardGrid
      sections={sections}
      getKey={pickKey}
      more={more}
      renderItem={(item) => (
        <CandidateTile
          item={item}
          collection={collections[item.collectionSlug]}
          selected={isSelected(item)}
          full={full}
          onToggle={() => onToggle(item, collections)}
        />
      )}
    />
  );
}

/** The loading, error and paging props the grid reads off an infinite candidates query. */
export function pagedGridProps(
  query: {
    isPending: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => Promise<unknown>;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    isFetchNextPageError: boolean;
    fetchNextPage: () => Promise<unknown>;
  },
  loaded: number,
) {
  return {
    pending: query.isPending,
    error: query.isError && loaded === 0 ? loadError(query.error, query.refetch) : null,
    more: {
      has: query.hasNextPage,
      loading: query.isFetchingNextPage,
      failed: query.isFetchNextPageError,
      load: () => void query.fetchNextPage(),
    },
  };
}
