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
import { groupItems } from "./copy-groups";
import type { Collections } from "./pick";
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
  const { selection, room, full, lists, fullId, onToggle, onCount, onOpen } = usePickerSelection();
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
      // one tile per collection, per section: a collection in both has a tile in each, told apart by
      // the section's place
      sections={sections.map((section, index) => ({
        ...section,
        items: groupItems(section.items, lists).map((group) => ({
          group,
          key: `${index}:${group.slug}`,
        })),
      }))}
      getKey={(entry) => entry.key}
      more={more}
      renderItem={({ group, key }) => (
        <CandidateTile
          group={group}
          groupKey={key}
          collection={collections[group.slug]}
          selection={selection}
          room={room}
          full={full}
          fullId={fullId}
          onToggle={(item) => onToggle(item, collections)}
          onCount={(item, next) => onCount(item, next, collections)}
          onOpen={(opener) => onOpen(group, collections, opener, key)}
          tag={tagOf?.(group.shown[0] ?? group.any!)}
        />
      )}
    />
  );
}
