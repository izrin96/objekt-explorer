import { LockSimpleIcon, LockSimpleOpenIcon } from "@phosphor-icons/react";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

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
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { useCosmoArtist } from "@/features/artist/cosmo-artist-provider";
import { absoluteTime } from "@/lib/time";
import { unobtainableSlugs } from "@/lib/unobtainables";
import { m } from "@/paraglide/messages";

import { ObjektFlip } from "../objekt-flip";
import { getCollectionShortNo, isObjektOwned } from "../objekt-utils";
import { collectionMetadataOptions, serialListOptions, transfersOptions } from "../queries";
import { MarketPanel } from "./market";
import { MetadataPanel } from "./metadata";
import { SerialsPanel, Timeline, toTimeline } from "./serials";

type Props = {
  objekt: ValidObjekt | null;
  onClose: () => void;
  /** the drawer does not know whose collection it is looking at; the surface does */
  locked?: boolean;
  onToggleLock?: () => void;
};

export function ObjektDrawer({ objekt, onClose, locked, onToggleLock }: Props) {
  return (
    <Drawer
      position="right"
      open={objekt !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {/* the kit's right-hand drawer is `w-[calc(100%-48px)]`; on a phone that
          gutter is width the header grid and the serial row cannot spare */}
      <DrawerPopup showCloseButton className="max-sm:w-full sm:max-w-lg">
        {objekt && (
          <DrawerBody
            key={objekt.id}
            objekt={objekt}
            onClose={onClose}
            locked={locked}
            onToggleLock={onToggleLock}
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
}: {
  objekt: ValidObjekt;
  onClose: () => void;
  locked?: boolean;
  onToggleLock?: () => void;
}) {
  const owned = isObjektOwned(objekt);
  const ownSerial = owned ? objekt.serial : null;
  const { getArtist } = useCosmoArtist();
  const [tab, setTab] = useState("serials");
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
      <DrawerHeader>
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

        <Tabs value={tab} onValueChange={(value) => setTab(String(value))}>
          <TabsList
            variant="underline"
            aria-label={m.objekt_tab_aria()}
            className="bg-popover sticky top-0 z-10 w-full justify-start border-b"
          >
            <TabsTab value="serials">{m.objekt_trades()}</TabsTab>
            <TabsTab value="market">{m.objekt_market()}</TabsTab>
            <TabsTab value="metadata">{m.objekt_metadata()}</TabsTab>
          </TabsList>
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
              onOpenSerial={(value) => {
                setSerial(value);
                setTab("serials");
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
