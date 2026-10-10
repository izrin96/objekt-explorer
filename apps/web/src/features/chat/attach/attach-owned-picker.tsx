import { CardsThreeIcon, LinkIcon } from "@phosphor-icons/react";
import { useInfiniteQuery } from "@tanstack/react-query";
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
import { ObjektCard } from "@/features/objekt/objekt-card";
import { isObjektOwned } from "@/features/objekt/objekt-utils";
import { VirtualCardGrid } from "@/features/objekt/virtual-card-grid";
import { ownedCollectionOptions } from "@/features/profile/queries";
import { useUserProfiles } from "@/features/user/hooks";
import { useLoadAllPages } from "@/hooks/use-load-all-pages";
import { displayNickname } from "@/lib/address";
import { m } from "@/paraglide/messages";

import { GridSkeleton, LoadError } from "./attach-picker-parts";

export function OwnedPicker({ onPick }: { onPick: (attachment: Attachment) => void }) {
  const profiles = useUserProfiles();
  const [picked, setPicked] = useState(profiles[0]?.address ?? "");
  const [filters, setFilters] = useState(NO_PICKER_FILTERS);
  const address = profiles.some((p) => p.address === picked) ? picked : profiles[0]?.address;

  if (!address) {
    return (
      <EmptyState
        icon={LinkIcon}
        bordered={false}
        title={m.chat_attach_no_profile()}
        action={
          <Button variant="outline" size="sm" render={<Link to="/account/profiles" />}>
            {m.link_link_cosmo()}
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PickerFilterBar filters={filters} onChange={setFilters}>
        {profiles.length > 1 ? (
          <SingleSelect
            label={m.chat_attach_profile_label()}
            options={profiles.map((p) => ({
              value: p.address,
              label: displayNickname(p.address, p.nickname),
            }))}
            value={address}
            defaultValue={profiles[0]!.address}
            onChange={setPicked}
          />
        ) : null}
      </PickerFilterBar>
      <OwnedGrid address={address} filters={filters} onPick={onPick} />
    </div>
  );
}

function OwnedGrid({
  address,
  filters,
  onPick,
}: {
  address: string;
  filters: PickerFacetFilters;
  onPick: (attachment: Attachment) => void;
}) {
  const query = useInfiniteQuery({ ...ownedCollectionOptions(address), throwOnError: false });
  // the filters run in the browser, so they need every page
  const filtering = pickerFiltered(filters);
  useLoadAllPages(filtering, query);

  if (query.isPending) return <GridSkeleton />;
  const all = query.data?.pages.flatMap((page) => page.objekts) ?? [];
  if (all.length === 0) {
    if (query.isError) return <LoadError onRetry={() => void query.refetch()} />;
    return <EmptyState icon={CardsThreeIcon} bordered={false} title={m.chat_attach_no_objekts()} />;
  }
  const objekts = filtering ? filterObjekts(toFilterSearch(filters), all) : all;
  if (objekts.length === 0 && !query.hasNextPage) {
    return <EmptyState icon={CardsThreeIcon} bordered={false} title={m.chat_attach_no_match()} />;
  }

  return (
    <VirtualCardGrid
      sections={[{ title: null, items: objekts }]}
      getKey={(objekt) => objekt.id}
      more={{
        has: query.hasNextPage,
        loading: query.isFetchingNextPage,
        failed: query.isFetchNextPageError,
        load: () => void query.fetchNextPage(),
      }}
      renderItem={(objekt) => (
        <ObjektCard
          objekt={objekt}
          image="thumbnail"
          description={m.chat_attach_title()}
          onOpen={() =>
            onPick({
              input: {
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
