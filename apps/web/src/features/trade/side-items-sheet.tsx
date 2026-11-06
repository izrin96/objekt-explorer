import type { Outputs } from "@repo/api";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { createContext, type ReactNode, type RefObject, use } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { getListLinkOption } from "@/features/list/list-link";
import { LIST_TYPE_LABEL } from "@/features/list/list-type-badge";
import { RatioChip } from "@/features/list/ratio-chip";
import { type RatioSide, ratioName, ratioSideOf } from "@/features/list/ratio-text";
import { CardGridSkeleton } from "@/features/objekt/card-grid";
import { ObjektCard, RATIO_ON_CARD } from "@/features/objekt/objekt-card";
import { PanelCardGrid } from "@/features/objekt/virtual-card-grid";
import { formatCurrency } from "@/features/settings/use-currency";
import { nearCountText, nearRingText } from "@/lib/near-text";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import { type NearOpen, type OpenObjekt, type SideNear } from "./near";
import type { PostSideData } from "./post-types";
import { sideItemsOptions } from "./queries";
import { stackPriceText } from "./stack-price";
import { NEAR_RING, RING, SlugTile } from "./thumb-grid";

/** For you's Compare with, as the feed sends it, so the sheet rings what the strip rings. */
export const SideCompareContext = createContext<{ list?: string; mutual: boolean }>({
  mutual: false,
});

type SideItem = Outputs["trade"]["sideItems"]["items"][number];

function SideCard({
  item,
  collection,
  near,
  onOpen,
  ratioSide,
  owner,
  currency,
}: {
  item: SideItem;
  collection: ValidObjekt | undefined;
  near: NearOpen | undefined;
  onOpen: OpenObjekt;
  ratioSide: RatioSide | null;
  owner: boolean;
  /** a sale side's list currency, its cards showing what they ask; null on a have or want side */
  currency: string | null;
}) {
  const description = near
    ? nearRingText(near.verb, item.qty)
    : item.ringed
      ? m.trade_match_ring()
      : undefined;
  const ring = item.ringed ? RING : near ? NEAR_RING : undefined;
  if (!collection) return <SlugTile className={ring}>{item.slug}</SlugTile>;
  const price =
    currency !== null
      ? stackPriceText(item, (amount) => formatCurrency(amount, currency))
      : undefined;
  const ratio = item.ratio !== undefined && ratioSide ? item.ratio : undefined;
  return (
    // the chip lies inert over the card, so the card carries its tooltip
    <div
      className="min-w-0"
      title={ratio !== undefined && ratioSide ? ratioName(ratio, ratioSide, { owner }) : undefined}
    >
      <ObjektCard
        objekt={collection}
        image="thumbnail"
        qty={item.qty > 1 ? item.qty : undefined}
        onOpen={(objekt) => onOpen(objekt, near)}
        imageClassName={ring}
        description={description}
        price={price?.text}
        priceMuted={price?.muted}
        note={currency !== null ? item.notes?.join("\n") : undefined}
        cornerBadge={
          ratio !== undefined && ratioSide ? (
            <RatioChip ratio={ratio} side={ratioSide} owner={owner} className={RATIO_ON_CARD} />
          ) : undefined
        }
      />
    </div>
  );
}

const KEY_SWATCH = "bg-muted inline-block h-3.5 w-2.5 shrink-0 rounded-xs outline-offset-1";

/** The two rings, named, while the sheet shows a near match beside the matches. */
function RingKey({ near }: { near: SideNear }) {
  return (
    <p className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
      <span className="flex items-center gap-2">
        <span aria-hidden className={`${KEY_SWATCH} outline-foreground outline-2`} />
        {m.trade_match_ring()}
      </span>
      <span className="flex items-center gap-2">
        <span
          aria-hidden
          className={`${KEY_SWATCH} outline-muted-foreground outline-2 outline-dashed`}
        />
        {nearCountText(near.verb, near.count)}
      </span>
    </p>
  );
}

/**
 * Every objekt of one of a person's lists, opened from its strip's "+N" tile, a page at a time:
 * the ones that match the viewer outlined and first, on their own tab when there are any. A want
 * side's rules lead it as the strip's tiles, since its objekt counts leave them out.
 */
export function SideItemsSheet({
  side,
  narrowed,
  rules,
  open,
  onOpenChange,
  onOpen,
  finalFocus,
  owner = false,
  actions,
}: {
  side: PostSideData;
  /** the feed's filters left objekts out of the strip; the sheet shows them all */
  narrowed: boolean;
  /** the side's rule tiles, as the strip draws them */
  rules?: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpen: OpenObjekt;
  /** where focus goes on close, when what opened it is gone by then (a menu item) */
  finalFocus?: RefObject<HTMLElement | null>;
  /** the viewer's own post: a ratio reads "You ask" */
  owner?: boolean;
  /** led by the footer: the post's Message and Make offer, on another person's post */
  actions?: ReactNode;
}) {
  const compare = use(SideCompareContext);
  const ratioSide = ratioSideOf(side.role);
  const currency = side.role === "sale" ? (side.list.currency ?? "") : null;
  const queryClient = useQueryClient();
  const options = sideItemsOptions(side.list.id, compare, open);
  const query = useInfiniteQuery(options);
  const first = query.data?.pages[0];

  // a list that changed between pages can send a collection again, under another newest copy
  const seen = new Set<string>();
  const items: SideItem[] = [];
  const collections: Record<string, ValidObjekt | undefined> = {};
  for (const page of query.data?.pages ?? []) {
    Object.assign(collections, page.collections);
    for (const item of page.items) {
      if (seen.has(item.slug)) continue;
      seen.add(item.slug);
      items.push(item);
    }
  }
  const ringed = items.filter((item) => item.ringed);

  // the objekt view is a modal of its own, so this one gives way to it
  const openObjekt: OpenObjekt = (objekt, near) => {
    onOpenChange(false);
    onOpen(objekt, near);
  };
  const nearOf = (myListIds: readonly number[]): NearOpen | undefined =>
    first?.near
      ? { verb: first.near.verb, role: side.role, theirList: side.list.name, myListIds }
      : undefined;
  const matchLabel = (count: number) =>
    side.role === "want"
      ? m.trade_list_count_you_have({ count: count.toLocaleString(getLocale()) })
      : m.trade_list_count_you_want({ count: count.toLocaleString(getLocale()) });
  const more = (has: boolean) => ({
    has,
    loading: query.isFetchingNextPage,
    failed: query.isFetchNextPageError,
    load: () => void query.fetchNextPage({ cancelRefetch: false }),
  });

  const grid = (shown: readonly SideItem[], has: boolean) => (
    <PanelCardGrid
      sections={[{ title: null, items: shown }]}
      getKey={(item) => item.slug}
      more={more(has)}
      renderItem={(item) => (
        <SideCard
          item={item}
          collection={collections[item.slug]}
          near={item.near ? nearOf(item.near) : undefined}
          onOpen={openObjekt}
          ratioSide={ratioSide}
          owner={owner}
          currency={currency}
        />
      )}
    />
  );

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      // a stale reopen would refetch every page it had loaded; dropping them costs one request
      onOpenChangeComplete={(next) => {
        if (!next) queryClient.removeQueries({ queryKey: options.queryKey, exact: true });
      }}
    >
      <SheetPopup side="right" className="sm:max-w-3xl" finalFocus={finalFocus}>
        <SheetHeader>
          <SheetTitle className="font-display truncate">{side.list.name}</SheetTitle>
          <SheetDescription>{LIST_TYPE_LABEL[side.role]()}</SheetDescription>
        </SheetHeader>
        <SheetPanel className="flex flex-col gap-3">
          {/* in the panel, not the header, so a long one scrolls; the post clips it to eight lines */}
          {side.list.description ? (
            <p className="text-muted-foreground text-sm text-pretty break-words whitespace-pre-wrap">
              {side.list.description}
            </p>
          ) : null}
          {narrowed ? (
            <p className="text-muted-foreground text-xs">{m.trade_side_unfiltered()}</p>
          ) : null}
          {rules}
          {!first ? (
            query.isError ? (
              <div className="flex flex-col items-center gap-2 py-6 text-sm">
                <p className="text-muted-foreground">{m.common_error_loading_data()}</p>
                <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
                  {m.common_error_retry()}
                </Button>
              </div>
            ) : (
              <CardGridSkeleton />
            )
          ) : (
            // keyed: a refetch that empties the matched tab must not leave it selected and hidden
            <Tabs
              key={first.matched > 0 ? "matched" : "all"}
              defaultValue={first.matched > 0 ? "matched" : "all"}
            >
              {first.matched > 0 ? (
                <TabsList aria-label={m.trade_side_tabs_label()}>
                  <TabsTab value="matched">{matchLabel(first.matched)}</TabsTab>
                  <TabsTab value="all">
                    {m.trade_side_all({
                      count: (first.items.length + first.more).toLocaleString(getLocale()),
                    })}
                  </TabsTab>
                </TabsList>
              ) : null}
              <TabsPanel value="matched">
                {grid(ringed, query.hasNextPage && ringed.length < first.matched)}
              </TabsPanel>
              <TabsPanel value="all" className="flex flex-col gap-3">
                {/* from the first page, so a near match arriving later doesn't push the grid down */}
                {first.near && first.near.count > 0 ? <RingKey near={first.near} /> : null}
                {grid(items, query.hasNextPage)}
              </TabsPanel>
            </Tabs>
          )}
        </SheetPanel>
        {/* a row that wraps, not the phone column of full-width buttons, so the grid keeps the height; the header X closes */}
        <SheetFooter className="flex-row flex-wrap py-3 *:flex-1 sm:*:flex-none">
          {actions}
          <Button variant="outline" render={<Link {...getListLinkOption(side.list)} />}>
            {m.trade_side_open_list()}
          </Button>
        </SheetFooter>
      </SheetPopup>
    </Sheet>
  );
}
