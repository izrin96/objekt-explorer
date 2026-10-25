import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { createContext, type ReactNode, use } from "react";

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
import { getListLinkOption } from "@/features/list/list-link";
import { LIST_TYPE_LABEL } from "@/features/list/list-type-badge";
import { ObjektCard } from "@/features/objekt/objekt-card";
import { m } from "@/paraglide/messages";

import type { PostSideData } from "./post-types";
import { sideItemsOptions } from "./queries";
import { RING, SlugTile } from "./thumb-grid";

/** For you's Compare with, as the feed sends it, so the dialog rings what the strip rings. */
export const SideCompareContext = createContext<{ list?: string; mutual: boolean }>({
  mutual: false,
});

const GRID = "grid grid-cols-4 gap-x-2 gap-y-3 sm:grid-cols-6";

type SideItem = { entryId: number; slug: string; qty: number; ringed?: true };

function SideGrid({
  items,
  collections,
  onOpen,
}: {
  items: readonly SideItem[];
  collections: Readonly<Record<string, ValidObjekt | undefined>>;
  onOpen: (objekt: ValidObjekt) => void;
}) {
  return (
    // padding gives the ring room
    <ul className={`${GRID} p-1`}>
      {items.map((item) => {
        const collection = collections[item.slug];
        const description = item.ringed ? m.trade_match_ring() : undefined;
        return (
          <li key={item.entryId} className="@container min-w-0">
            {collection ? (
              <ObjektCard
                objekt={collection}
                image="thumbnail"
                qty={item.qty > 1 ? item.qty : undefined}
                onOpen={onOpen}
                imageClassName={item.ringed ? RING : undefined}
                description={description}
              />
            ) : (
              <SlugTile className={item.ringed ? RING : undefined}>{item.slug}</SlugTile>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Every objekt of one of a person's lists, opened from its strip's "+N" tile: the ones that match
 * the viewer outlined and first, on their own tab when there are any. A want side's rules lead it
 * as the strip's tiles, since its objekt counts leave them out.
 */
export function SideItemsDialog({
  side,
  narrowed,
  rules,
  open,
  onOpenChange,
  onOpen,
}: {
  side: PostSideData;
  /** the feed's filters left objekts out of the strip; the dialog shows them all */
  narrowed: boolean;
  /** the side's rule tiles, as the strip draws them */
  rules?: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpen: (objekt: ValidObjekt) => void;
}) {
  const compare = use(SideCompareContext);
  const query = useQuery(sideItemsOptions(side.list.id, compare, open));
  const data = query.data;
  // the objekt view is a modal of its own, so this one gives way to it
  const openObjekt = (objekt: ValidObjekt) => {
    onOpenChange(false);
    onOpen(objekt);
  };
  const matchLabel = (count: number) =>
    side.role === "want"
      ? m.trade_list_count_you_have({ count })
      : m.trade_list_count_you_want({ count });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display truncate">{side.list.name}</DialogTitle>
          <DialogDescription>{LIST_TYPE_LABEL[side.role]()}</DialogDescription>
        </DialogHeader>
        <DialogPanel className="flex flex-col gap-3">
          {narrowed ? (
            <p className="text-muted-foreground text-xs">{m.trade_side_unfiltered()}</p>
          ) : null}
          {rules}
          {!data ? (
            query.isError ? (
              <div className="flex flex-col items-center gap-2 py-6 text-sm">
                <p className="text-muted-foreground">{m.common_error_loading_data()}</p>
                <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
                  {m.common_error_retry()}
                </Button>
              </div>
            ) : (
              <div className={GRID} aria-busy>
                {Array.from({ length: 12 }, (_, i) => (
                  <Skeleton key={i} className="rounded-photocard aspect-photocard" />
                ))}
              </div>
            )
          ) : (
            // keyed: a refetch that empties the matched tab must not leave it selected and hidden
            <Tabs
              key={data.matched > 0 ? "matched" : "all"}
              defaultValue={data.matched > 0 ? "matched" : "all"}
            >
              {data.matched > 0 ? (
                <TabsList aria-label={m.trade_side_tabs_label()}>
                  <TabsTab value="matched">{matchLabel(data.matched)}</TabsTab>
                  <TabsTab value="all">
                    {m.trade_side_all({ count: data.items.length + data.more })}
                  </TabsTab>
                </TabsList>
              ) : null}
              <TabsPanel value="matched">
                <SideGrid
                  items={data.items.filter((item) => item.ringed)}
                  collections={data.collections}
                  onOpen={openObjekt}
                />
              </TabsPanel>
              <TabsPanel value="all" className="flex flex-col gap-3">
                <SideGrid items={data.items} collections={data.collections} onOpen={openObjekt} />
                {data.more > 0 ? (
                  <p className="text-muted-foreground text-xs">
                    {m.trade_side_more({ count: data.more })}
                  </p>
                ) : null}
              </TabsPanel>
            </Tabs>
          )}
        </DialogPanel>
        <DialogFooter>
          <Button variant="outline" render={<Link {...getListLinkOption(side.list)} />}>
            {m.trade_side_open_list()}
          </Button>
          <DialogClose render={<Button variant="outline" />}>{m.common_modal_close()}</DialogClose>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
