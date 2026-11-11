import { CardsThreeIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";

import { EmptyState } from "@/components/shared/empty-state";
import type { Attachment } from "@/features/chat/attachment";
import { filterObjekts } from "@/features/filters/filter-utils";
import {
  type PickerFacetFilters,
  pickerFiltered,
  toFilterSearch,
} from "@/features/filters/picker-filters";
import { listEntriesOptions } from "@/features/list/queries";
import { CardGridSkeleton } from "@/features/objekt/card-grid";
import { ObjektCard } from "@/features/objekt/objekt-card";
import { VirtualCardGrid } from "@/features/objekt/virtual-card-grid";
import { m } from "@/paraglide/messages";

import { LoadError } from "./attach-picker-parts";

export function ListGrid({
  slug,
  name,
  filters,
  onPick,
}: {
  slug: string;
  name: string;
  filters: PickerFacetFilters;
  onPick: (attachment: Attachment) => void;
}) {
  const query = useQuery(listEntriesOptions(slug, []));

  if (query.isPending) return <CardGridSkeleton />;
  if (query.isError) return <LoadError onRetry={() => void query.refetch()} />;
  // one card per collection: a list's collection is what the card names
  const all = [...new Map((query.data ?? []).map((entry) => [entry.slug, entry])).values()];
  if (all.length === 0) {
    return <EmptyState icon={CardsThreeIcon} bordered={false} title={m.chat_attach_list_empty()} />;
  }
  const collections = pickerFiltered(filters) ? filterObjekts(toFilterSearch(filters), all) : all;
  if (collections.length === 0) {
    return <EmptyState icon={CardsThreeIcon} bordered={false} title={m.chat_attach_no_match()} />;
  }

  return (
    <VirtualCardGrid
      sections={[{ title: null, items: collections }]}
      getKey={(objekt) => objekt.slug}
      renderItem={(objekt) => (
        <ObjektCard
          objekt={objekt}
          image="thumbnail"
          hideSerial
          description={m.chat_attach_title()}
          onOpen={() =>
            onPick({
              kind: "objekt",
              input: { kind: "objekt", collectionSlug: objekt.slug, listSlug: slug },
              objekt,
              listName: name,
            })
          }
        />
      )}
    />
  );
}
