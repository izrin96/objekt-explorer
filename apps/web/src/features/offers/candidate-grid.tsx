import { ArrowClockwiseIcon, CardsThreeIcon, WarningIcon } from "@phosphor-icons/react";
import type { CandidateItem } from "@repo/api/schemas/offer";
import type { PickerTag } from "@repo/api/schemas/trade";
import { type ReactNode, use } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { CardGridSkeleton } from "@/features/objekt/card-grid";
import { VirtualCardGrid } from "@/features/objekt/virtual-card-grid";
import { m } from "@/paraglide/messages";

import { CandidateTile } from "./candidate-tile";
import { type Collections, pickKey } from "./pick";
import { type PickerSelection, PickerSelectionContext } from "./picker-selection";

function usePickerSelection(): PickerSelection {
  const selection = use(PickerSelectionContext);
  if (!selection) throw new Error("CandidateGrid must be used within PickerSelectionContext");
  return selection;
}

export function CandidateGrid({
  sections,
  collections,
  pending,
  error,
  empty,
  more,
  tagOf,
}: {
  sections: { title: string | null; items: CandidateItem[] }[];
  collections: Collections;
  pending: boolean;
  error: { retry: () => void; text: string | null } | null;
  empty: { title: string; hint?: string; action?: ReactNode };
  more?: { has: boolean; loading: boolean; failed: boolean; load: () => void };
  tagOf?: (item: CandidateItem) => PickerTag | undefined;
}) {
  const { isSelected, countOf, copiesOf, full, fullId, onToggle, onCount } = usePickerSelection();
  if (pending) {
    return <CardGridSkeleton />;
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
      <EmptyState
        icon={CardsThreeIcon}
        bordered={false}
        title={empty.title}
        hint={empty.hint}
        action={empty.action}
      />
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
          count={countOf(item)}
          copies={copiesOf(item)}
          full={full}
          fullId={fullId}
          onToggle={() => onToggle(item, collections)}
          onCount={(next) => onCount(item, next, collections)}
          tag={tagOf?.(item)}
        />
      )}
    />
  );
}
