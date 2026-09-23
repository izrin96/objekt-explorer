import {
  CheckIcon,
  DotsThreeIcon,
  LockSimpleIcon,
  LockSimpleOpenIcon,
} from "@phosphor-icons/react";
import type { SortBy } from "@repo/api/schemas/market";
import type { OwnedObjekt, ValidObjekt } from "@repo/lib/types/objekt";
import { useQuery } from "@tanstack/react-query";
import { type ReactNode, useMemo, useState } from "react";

import { ApolloIcon } from "@/components/shared/apollo-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerDescription,
  DrawerHeader,
  DrawerPanel,
  DrawerPopup,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Menu, MenuPopup, MenuTrigger } from "@/components/ui/menu";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { useCosmoArtist } from "@/features/artist/cosmo-artist-provider";
import { absoluteTime } from "@/lib/time";
import { unobtainableSlugs } from "@/lib/unobtainables";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { ObjektFlip } from "../objekt-flip";
import { getCollectionShortNo, isObjektOwned } from "../objekt-utils";
import { collectionMetadataOptions, serialListOptions, transfersOptions } from "../queries";
import { MarketPanel } from "./market";
import { MetadataPanel } from "./metadata";
import { OwnedPanel, type OwnedRowMenu } from "./owned";
import { SerialsPanel, Timeline, toTimeline } from "./serials";

type DrawerTab = "owned" | "serials" | "market" | "metadata";

type Props = {
  objekt: ValidObjekt | null;
  onClose: () => void;
  /** the drawer does not know whose collection it is looking at; the surface does */
  locked?: boolean;
  onToggleLock?: () => void;
  defaultTab?: Extract<DrawerTab, "serials" | "market">;
  /**
   * Every copy of the open collection the surface's profile holds. Passing it
   * at all marks the surface an owned view, so an unowned collection still gets
   * the tab — empty — rather than the tab appearing and vanishing per card.
   */
  owned?: OwnedObjekt[];
  ownedMenu?: OwnedRowMenu;
  selected?: boolean;
  /** the card's check and menu are hover-only, so a touch surface reaches them here */
  onToggleSelect?: (objekt: ValidObjekt) => void;
  /** the items only; the sheet supplies the trigger and the popup */
  menu?: ReactNode;
};

export function ObjektDrawer({
  objekt,
  onClose,
  locked,
  onToggleLock,
  defaultTab = "serials",
  owned,
  ownedMenu,
  selected = false,
  onToggleSelect,
  menu,
}: Props) {
  const showOwned = owned !== undefined;
  // the body unmounts on close, so the chosen tab is held here instead: one
  // mount per page, so reopening keeps it and navigating away resets it
  const [tab, setTab] = useState<DrawerTab>(showOwned ? "owned" : defaultTab);

  return (
    <Drawer
      position="right"
      open={objekt !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {/* the kit's 48px gutter is kept on a phone: full width leaves no backdrop
          to tap, and the close button becomes the only way out */}
      <DrawerPopup showCloseButton className="sm:max-w-lg">
        {objekt && (
          <DrawerBody
            key={objekt.id}
            objekt={objekt}
            onClose={onClose}
            locked={locked}
            onToggleLock={onToggleLock}
            tab={tab}
            onTabChange={setTab}
            owned={owned}
            ownedMenu={ownedMenu}
            selected={selected}
            onToggleSelect={onToggleSelect}
            menu={menu}
            marketSort={defaultTab === "market" ? "price" : "createdAt"}
          />
        )}
      </DrawerPopup>
    </Drawer>
  );
}

function DrawerBody({
  objekt,
  onClose,
  locked,
  onToggleLock,
  tab,
  onTabChange,
  owned: ownedCopies,
  ownedMenu,
  selected: isSelected,
  onToggleSelect,
  menu,
  marketSort,
}: {
  objekt: ValidObjekt;
  onClose: () => void;
  locked?: boolean;
  onToggleLock?: () => void;
  tab: DrawerTab;
  onTabChange: (tab: DrawerTab) => void;
  owned?: OwnedObjekt[];
  ownedMenu?: OwnedRowMenu;
  selected: boolean;
  onToggleSelect?: (objekt: ValidObjekt) => void;
  menu?: ReactNode;
  marketSort: SortBy;
}) {
  const owned = isObjektOwned(objekt);
  const ownSerial = owned ? objekt.serial : null;
  const { getArtist } = useCosmoArtist();
  const [serial, setSerial] = useState<number | null>(ownSerial);

  const metadata = useQuery(collectionMetadataOptions(objekt.slug));
  const serials = useQuery(serialListOptions(objekt.slug));

  // until the user picks one, a collection opens on the first minted serial
  const selected = serial ?? serials.data?.[0] ?? null;
  const transfers = useQuery(transfersOptions(objekt.slug, selected));

  // the Metadata tab describes the token the card carried, not whatever serial
  // the user has browsed to; usually the same request the timeline is showing
  const sameSerial = ownSerial !== null && ownSerial === selected;
  const ownTransfers = useQuery(transfersOptions(objekt.slug, sameSerial ? null : ownSerial));
  const own = sameSerial ? transfers : ownTransfers;

  const mintedAt = useMemo(() => {
    if (ownSerial === null) return null;
    const mint = toTimeline(own.data?.transfers ?? []).at(-1);
    return mint?.kind === "mint" ? mint.at : null;
  }, [ownSerial, own.data]);

  const artistName = getArtist(objekt.artist)?.title ?? objekt.artist;

  const attributes: [string, string][] = [
    [m.objekt_artist(), artistName],
    [m.objekt_member(), objekt.member],
    [m.objekt_season(), objekt.season],
    [m.objekt_class(), objekt.class],
    [m.objekt_collection_no(), objekt.collectionNo],
    [m.objekt_type(), objekt.onOffline === "offline" ? m.objekt_physical() : m.objekt_digital()],
  ];
  if (owned) attributes.push([m.objekt_serial(), `#${objekt.serial}`]);

  return (
    <>
      {/* the trailing padding clears the registry close button, which is absolute
          at `inset-e-2 top-2` over the header */}
      <DrawerHeader className="flex-row items-start gap-2 pe-13 sm:pe-12">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <DrawerTitle className="font-display flex flex-wrap items-center gap-2">
            {objekt.member}
            {/* the season and collection no. are what name this objekt — full contrast, not a caption */}
            <span className="font-mono text-base font-medium">{getCollectionShortNo(objekt)}</span>
            {unobtainableSlugs.has(objekt.slug) && (
              <Badge variant="error" size="sm">
                {m.objekt_unobtainable()}
              </Badge>
            )}
          </DrawerTitle>
          {/* artist / season / class are the first rows of the attribute list a
              few pixels below, so the line is only for a screen reader */}
          <DrawerDescription className="sr-only">
            {artistName} · {objekt.season} · {objekt.class}
          </DrawerDescription>
        </div>
        {(onToggleSelect || menu) && (
          <div className="flex shrink-0 items-center gap-1.5">
            {onToggleSelect && (
              <Button
                variant="outline"
                size="icon-sm"
                aria-label={isSelected ? m.objekt_deselect_aria() : m.objekt_select_aria()}
                aria-pressed={isSelected}
                onClick={() => onToggleSelect(objekt)}
                className={cn(
                  isSelected &&
                    "bg-foreground text-background border-foreground hover:bg-foreground/90 dark:bg-foreground dark:hover:bg-foreground/90",
                )}
              >
                <CheckIcon weight="bold" />
              </Button>
            )}
            {menu && (
              <Menu>
                <MenuTrigger
                  render={
                    <Button variant="outline" size="icon-sm" aria-label={m.objekt_menu_aria()} />
                  }
                >
                  <DotsThreeIcon weight="bold" />
                </MenuTrigger>
                <MenuPopup align="end" className="min-w-44">
                  {menu}
                </MenuPopup>
              </Menu>
            )}
          </div>
        )}
      </DrawerHeader>
      <DrawerPanel className="flex flex-col gap-5">
        {/* one column below `sm`: the card at its natural 11rem plus an
            attribute list whose labels alone are ~84px leaves the values under
            100px, which is what pushed the drawer into sideways scrolling */}
        <div className="grid gap-5 sm:grid-cols-[minmax(0,11rem)_1fr]">
          <div className="w-full max-sm:mx-auto max-sm:max-w-44">
            <ObjektFlip objekt={objekt} />
          </div>
          <div className="flex min-w-0 flex-col gap-3">
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] content-start gap-x-4 gap-y-1.5 text-sm">
              {attributes.map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-mono">{value}</dd>
                </div>
              ))}
              {owned && (
                <>
                  <dt className="text-muted-foreground">{m.objekt_transferable()}</dt>
                  <dd>
                    <Badge variant={objekt.transferable ? "success" : "warning"} size="sm">
                      {objekt.transferable ? m.objekt_yes() : m.objekt_no()}
                    </Badge>
                  </dd>
                  <dt className="text-muted-foreground">{m.objekt_received()}</dt>
                  <dd className="font-mono">{absoluteTime(new Date(objekt.receivedAt))}</dd>
                </>
              )}
            </dl>

            <div className="flex flex-wrap items-center gap-2">
              {/* a drawer tab list that navigates away reads as a trap, so this
                  sits with the actions rather than in the tabs */}
              <Button
                variant="outline"
                size="sm"
                render={
                  <a
                    href={`https://apollo.cafe/?id=${objekt.slug}`}
                    target="_blank"
                    rel="noreferrer"
                  />
                }
              >
                <ApolloIcon className="size-4" />
                {m.objekt_view_in_apollo()}
              </Button>
              {owned && onToggleLock && (
                <Button variant="outline" size="sm" onClick={onToggleLock}>
                  {locked ? <LockSimpleOpenIcon /> : <LockSimpleIcon />}
                  {locked ? m.objekt_menu_unlock() : m.objekt_menu_lock()}
                </Button>
              )}
            </div>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(value) => onTabChange(value as DrawerTab)}>
          {/* four tabs outrun a phone-width sheet, so the strip scrolls and the
              sheet does not; `data-scroll-x` declares that to the dev guard */}
          <div
            data-scroll-x
            // focus alone never scrolls the strip: a tab past the fold would
            // stay clipped once reached by keyboard or by tap
            onFocusCapture={(event) =>
              event.target.scrollIntoView({ block: "nearest", inline: "nearest" })
            }
            className="bg-popover sticky top-0 z-10 [scrollbar-width:none] overflow-x-auto"
          >
            {/* `w-max min-w-full`, not `w-full`: `w-full` clamps the underline
                rule to the scroller while the tabs spill past it */}
            <TabsList
              variant="underline"
              aria-label={m.objekt_tab_aria()}
              className="w-max min-w-full justify-start border-b"
            >
              {ownedCopies && (
                <TabsTab value="owned">
                  {m.objekt_owned()}
                  {ownedCopies.length > 1 ? ` (${ownedCopies.length.toLocaleString()})` : ""}
                </TabsTab>
              )}
              <TabsTab value="serials">{m.objekt_trades()}</TabsTab>
              <TabsTab value="market">{m.objekt_market()}</TabsTab>
              <TabsTab value="metadata">{m.objekt_metadata()}</TabsTab>
            </TabsList>
          </div>
          {ownedCopies && (
            <TabsPanel value="owned">
              <OwnedPanel
                objekts={ownedCopies}
                menu={ownedMenu}
                onOpenSerial={(value) => {
                  setSerial(value);
                  onTabChange("serials");
                }}
              />
            </TabsPanel>
          )}
          <TabsPanel value="serials">
            <SerialsPanel
              serial={selected}
              serials={serials.data ?? []}
              metadata={metadata}
              loading={serials.isPending}
              onSerialChange={setSerial}
            >
              <Timeline serial={selected} query={transfers} onClose={onClose} />
            </SerialsPanel>
          </TabsPanel>
          <TabsPanel value="market">
            <MarketPanel
              slug={objekt.slug}
              defaultSortBy={marketSort}
              onOpenSerial={(value) => {
                setSerial(value);
                onTabChange("serials");
              }}
            />
          </TabsPanel>
          <TabsPanel value="metadata">
            <MetadataPanel
              objekt={objekt}
              tokenId={own.data?.tokenId ?? null}
              mintedAt={mintedAt}
            />
          </TabsPanel>
        </Tabs>
      </DrawerPanel>
    </>
  );
}
