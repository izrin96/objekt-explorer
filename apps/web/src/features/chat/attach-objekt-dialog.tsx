import { ArrowClockwiseIcon, CardsThreeIcon, LinkIcon, WarningIcon } from "@phosphor-icons/react";
import type { CardInput } from "@repo/api/schemas/chat";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { InfiniteSentinel } from "@/components/shared/infinite-sentinel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { SingleSelect } from "@/features/filters/single-select";
import { listEntriesOptions } from "@/features/list/queries";
import { ObjektCard } from "@/features/objekt/objekt-card";
import { isObjektOwned } from "@/features/objekt/objekt-utils";
import { ownedCollectionOptions } from "@/features/profile/queries";
import { useUserLists, useUserProfiles } from "@/features/user/hooks";
import { displayNickname } from "@/lib/address";
import { m } from "@/paraglide/messages";

export type Attachment = { input: CardInput; objekt: ValidObjekt; listName: string | null };

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
      <DialogPopup className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">{m.chat_attach_title()}</DialogTitle>
          <DialogDescription>{m.chat_attach_description()}</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="objekts" className="min-h-0 gap-0">
          <div className="mx-6 shrink-0">
            <TabsList variant="underline" className="w-full justify-start border-b">
              <TabsTab value="objekts">{m.chat_attach_objekts()}</TabsTab>
              <TabsTab value="lists">{m.chat_attach_lists()}</TabsTab>
            </TabsList>
          </div>
          <DialogPanel className="pt-4!">
            <TabsPanel value="objekts">
              <OwnedPicker onPick={pick} />
            </TabsPanel>
            <TabsPanel value="lists">
              <ListPicker onPick={pick} />
            </TabsPanel>
          </DialogPanel>
        </Tabs>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>{m.common_modal_cancel()}</DialogClose>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

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
        <Skeleton key={i} className="rounded-photocard aspect-photocard" />
      ))}
    </div>
  );
}

function OwnedPicker({ onPick }: { onPick: (attachment: Attachment) => void }) {
  const profiles = useUserProfiles();
  const [picked, setPicked] = useState(profiles[0]?.address ?? "");
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
    <div className="flex flex-col gap-3">
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
      <OwnedGrid address={address} onPick={onPick} />
    </div>
  );
}

function OwnedGrid({
  address,
  onPick,
}: {
  address: string;
  onPick: (attachment: Attachment) => void;
}) {
  const query = useInfiniteQuery({ ...ownedCollectionOptions(address), throwOnError: false });

  if (query.isPending) return <GridSkeleton />;
  const objekts = query.data?.pages.flatMap((page) => page.objekts) ?? [];
  if (objekts.length === 0) {
    if (query.isError) return <LoadError onRetry={() => void query.refetch()} />;
    return <EmptyState icon={CardsThreeIcon} bordered={false} title={m.chat_attach_no_objekts()} />;
  }

  return (
    <>
      <ul className={GRID}>
        {objekts.map((objekt) => (
          <li key={objekt.id} className="@container min-w-0">
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
          </li>
        ))}
      </ul>
      <InfiniteSentinel
        label={m.infinite_query_load_more_aria()}
        hasNextPage={query.hasNextPage}
        isFetchingNextPage={query.isFetchingNextPage}
        isError={query.isFetchNextPageError}
        fetchNextPage={() => void query.fetchNextPage()}
      />
    </>
  );
}

function ListPicker({ onPick }: { onPick: (attachment: Attachment) => void }) {
  const lists = useUserLists();
  const [picked, setPicked] = useState(lists[0]?.slug ?? "");
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
    <div className="flex flex-col gap-3">
      <SingleSelect
        label={m.chat_attach_list_label()}
        options={lists.map((l) => ({ value: l.slug, label: l.name }))}
        value={list.slug}
        defaultValue={lists[0]!.slug}
        onChange={setPicked}
      />
      <ListGrid slug={list.slug} name={list.name} onPick={onPick} />
    </div>
  );
}

function ListGrid({
  slug,
  name,
  onPick,
}: {
  slug: string;
  name: string;
  onPick: (attachment: Attachment) => void;
}) {
  const query = useQuery(listEntriesOptions(slug, []));

  if (query.isPending) return <GridSkeleton />;
  if (query.isError) return <LoadError onRetry={() => void query.refetch()} />;
  // one card per collection: a list's collection is what the card names
  const collections = [...new Map((query.data ?? []).map((entry) => [entry.slug, entry])).values()];
  if (collections.length === 0) {
    return <EmptyState icon={CardsThreeIcon} bordered={false} title={m.chat_attach_list_empty()} />;
  }

  return (
    <ul className={GRID}>
      {collections.map((objekt) => (
        <li key={objekt.slug} className="@container min-w-0">
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
        </li>
      ))}
    </ul>
  );
}
