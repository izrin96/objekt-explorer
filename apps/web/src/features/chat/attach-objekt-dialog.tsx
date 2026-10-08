import { ArrowClockwiseIcon, CardsThreeIcon, LinkIcon, WarningIcon } from "@phosphor-icons/react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
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
import { isObjektOwned } from "@/features/objekt/objekt-utils";
import { PhotocardSkeleton } from "@/features/objekt/photocard-skeleton";
import { VirtualCardGrid } from "@/features/objekt/virtual-card-grid";
import { ownedCollectionOptions } from "@/features/profile/queries";
import { useUserLists, useUserProfiles } from "@/features/user/hooks";
import { useLoadAllPages } from "@/hooks/use-load-all-pages";
import { displayNickname } from "@/lib/address";
import { m } from "@/paraglide/messages";

import type { Attachment } from "./attachment";

export function AttachObjektDialog({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (attachment: Attachment) => void;
}) {
  const pick = (attachment: Attachment) => {
    onPick(attachment);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* a fixed height, so the grid scrolls inside it and stays virtualised */}
      <DialogPopup className="h-[min(48rem,calc(100dvh-(--spacing(8))))] max-w-3xl max-sm:h-[calc(100dvh-(--spacing(12)))]">
        <DialogHeader>
          <DialogTitle className="font-display">{m.chat_attach_title()}</DialogTitle>
          <DialogDescription>{m.chat_attach_description()}</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="objekts" className="min-h-0 flex-1 gap-0">
          <div className="mx-6 shrink-0">
            <TabsList variant="underline" className="w-full justify-start border-b">
              <TabsTab value="objekts">{m.chat_attach_objekts()}</TabsTab>
              <TabsTab value="lists">{m.chat_attach_lists()}</TabsTab>
            </TabsList>
          </div>
          <TabsPanel value="objekts" className={PANEL}>
            <OwnedPicker onPick={pick} />
          </TabsPanel>
          <TabsPanel value="lists" className={PANEL}>
            <ListPicker onPick={pick} />
          </TabsPanel>
        </Tabs>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>{m.common_modal_cancel()}</DialogClose>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

const PANEL = "flex min-h-0 flex-col px-6 pt-4 pb-4";

const GRID = "grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5";

function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyState
      icon={WarningIcon}
      bordered={false}
      title={m.common_error_loading_data()}
      action={
        <Button variant="outline" size="sm" onClick={onRetry}>
          <ArrowClockwiseIcon />
          {m.common_error_retry()}
        </Button>
      }
    />
  );
}

function GridSkeleton() {
  return (
    <div className={GRID}>
      {[0, 1, 2, 3, 4].map((i) => (
        <PhotocardSkeleton key={i} />
      ))}
    </div>
  );
}

function OwnedPicker({ onPick }: { onPick: (attachment: Attachment) => void }) {
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

function ListPicker({ onPick }: { onPick: (attachment: Attachment) => void }) {
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
