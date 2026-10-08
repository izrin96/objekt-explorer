import { CardsThreeIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import type { Attachment } from "@/features/chat/attachment";
import { filterObjekts } from "@/features/filters/filter-utils";
import {
  NO_PICKER_FILTERS,
  PickerFilterBar,
  type PickerFacetFilters,
  pickerFiltered,
  toFilterSearch,
} from "@/features/filters/picker-filter-bar";
import { SingleSelect } from "@/features/filters/single-select";
import { listEntriesOptions } from "@/features/list/queries";
import { ObjektCard } from "@/features/objekt/objekt-card";
import { VirtualCardGrid } from "@/features/objekt/virtual-card-grid";
import { useUserLists } from "@/features/user/hooks";
import { m } from "@/paraglide/messages";

import { GridSkeleton, LoadError } from "./attach-picker-parts";

export function ListPicker({ onPick }: { onPick: (attachment: Attachment) => void }) {
  const lists = useUserLists();
  const [picked, setPicked] = useState(lists[0]?.slug ?? "");
  const [filters, setFilters] = useState(NO_PICKER_FILTERS);
  const list = lists.find((l) => l.slug === picked) ?? lists[0];

  if (!list) {
    return (
      <EmptyState
        icon={CardsThreeIcon}
        bordered={false}
        title={m.chat_attach_no_lists()}
        action={
          <Button variant="outline" size="sm" render={<Link to="/list" />}>
            {m.nav_manage_list()}
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PickerFilterBar filters={filters} onChange={setFilters}>
        <SingleSelect
          label={m.chat_attach_list_label()}
          options={lists.map((l) => ({ value: l.slug, label: l.name }))}
          value={list.slug}
          defaultValue={lists[0]!.slug}
          onChange={setPicked}
        />
      </PickerFilterBar>
      <ListGrid slug={list.slug} name={list.name} filters={filters} onPick={onPick} />
    </div>
  );
}

function ListGrid({
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

  if (query.isPending) return <GridSkeleton />;
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
              input: { collectionSlug: objekt.slug, listSlug: slug },
              objekt,
              listName: name,
            })
          }
        />
      )}
    />
  );
}
