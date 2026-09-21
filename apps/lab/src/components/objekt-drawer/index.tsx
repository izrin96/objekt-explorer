import { LockSimpleIcon, LockSimpleOpenIcon } from "@phosphor-icons/react";
import { format } from "date-fns";
import { useMemo, useState } from "react";

import { MarketPanel } from "@/components/objekt-drawer/market";
import { MetadataPanel } from "@/components/objekt-drawer/metadata";
import { SerialsPanel, Timeline } from "@/components/objekt-drawer/serials";
import {
  fixtureTimeline,
  type Metadata,
  type SerialList,
  toTimeline,
  type TransferResponse,
} from "@/components/objekt-drawer/types";
import { ObjektFlip } from "@/components/objekt-flip";
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
import type { LabObjekt } from "@/fixtures/objekts";
import { isPrivateSerial, serialsFor } from "@/fixtures/serials";
import { useApi } from "@/hooks/use-api";
import { collectionShortNo } from "@/lib/objekt";

type Props = {
  objekt: LabObjekt | null;
  onClose: () => void;
  /**
   * Owned mode only, and only when the viewer owns the profile: the lock
   * toggle beside "View in Apollo". The drawer is opened from five surfaces
   * and knows nothing about whose collection it is looking at, so the one
   * that does hands it the flag and the callback rather than a profile.
   */
  locked?: boolean;
  onToggleLock?: () => void;
};

/**
 * Card click → right-side Drawer with the big front image, the attribute list
 * and nested Tabs (Serials / Market / Metadata).
 *
 * Two modes, decided by whether the card carried a serial: collection mode
 * (Home / Market / Activity / Lists) describes the collection and opens on the
 * first minted serial; owned mode (Profile) opens on the token's own serial.
 */
export function ObjektDrawer({ objekt, onClose, locked, onToggleLock }: Props) {
  return (
    <Drawer
      position="right"
      open={objekt !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {/* cnippet's right-hand drawer is `w-[calc(100%-48px)]`; on a phone that
          48px gutter is width the header grid and the serial row cannot spare,
          so below `sm` the drawer takes the whole viewport */}
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
  objekt: LabObjekt;
  onClose: () => void;
  locked?: boolean;
  onToggleLock?: () => void;
}) {
  const owned = objekt.serial !== undefined;
  const [tab, setTab] = useState("serials");
  const [serial, setSerial] = useState<number | null>(objekt.serial ?? null);

  const metadata = useApi<Metadata>(`/api/objekts/metadata/${objekt.slug}`);
  const list = useApi<SerialList>(`/api/objekts/list/${objekt.slug}`);

  // the fixtures stand in for whichever request failed, tagged in the panel
  const serials = useMemo(
    () =>
      list.error ? serialsFor(objekt.slug).map((row) => row.serial) : (list.data?.serials ?? []),
    [list.error, list.data, objekt.slug],
  );

  // until the user picks one, collection mode sits on the first minted serial
  const selected = serial ?? serials[0] ?? null;
  const hasSerial = selected !== null && selected > 0;

  const transfers = useApi<TransferResponse>(
    hasSerial ? `/api/objekts/transfers/${objekt.slug}/${selected}` : null,
  );
  const offlineTransfers = transfers.error;

  const events = useMemo(() => {
    if (!hasSerial) return [];
    return offlineTransfers
      ? fixtureTimeline(objekt.slug, selected)
      : toTimeline(transfers.data?.transfers ?? []);
  }, [hasSerial, offlineTransfers, transfers.data, objekt.slug, selected]);

  // The Metadata tab describes the token the card carried, not whatever serial
  // the user has browsed to — so it needs that serial's response. Usually the
  // same one the timeline is already showing; only a second request once the
  // user moves off it.
  const ownSerial = objekt.serial ?? null;
  const ownTransfers = useApi<TransferResponse>(
    ownSerial !== null && ownSerial !== selected
      ? `/api/objekts/transfers/${objekt.slug}/${ownSerial}`
      : null,
  );
  const own = ownSerial === selected ? transfers : ownTransfers;

  const mint = own.error
    ? fixtureTimeline(objekt.slug, ownSerial ?? 0).at(-1)
    : toTimeline(own.data?.transfers ?? []).at(-1);
  const mintedAt = ownSerial !== null && mint?.kind === "mint" ? mint.at : null;
  // a live `hide` response carries no token id either, so only the fixture
  // branch needs the private rule applied by hand
  const tokenId =
    ownSerial === null
      ? null
      : own.error
        ? isPrivateSerial(ownSerial)
          ? null
          : (serialsFor(objekt.slug).find((row) => row.serial === ownSerial)?.tokenId ?? null)
        : (own.data?.tokenId ?? null);

  const openSerial = (value: number) => {
    setSerial(value);
    setTab("serials");
  };

  const attributes: [string, string][] = [
    ["Artist", objekt.artist],
    ["Member", objekt.member],
    ["Season", objekt.season],
    ["Class", objekt.class],
    ["Collection", collectionShortNo(objekt)],
    ["Type", objekt.onOffline === "offline" ? "offline" : "online"],
  ];
  if (objekt.serial !== undefined) attributes.push(["Serial", `#${objekt.serial}`]);

  return (
    <>
      <DrawerHeader>
        <DrawerTitle className="font-display flex flex-wrap items-center gap-2">
          {objekt.member}
          {/* the collection no. and serial are what names this objekt — the
              title carries them at full contrast, not as a caption */}
          <span className="font-mono text-base font-medium">
            {collectionShortNo(objekt)}
            {objekt.serial !== undefined && ` #${objekt.serial}`}
          </span>
        </DrawerTitle>
        {/* no visible subtitle: artist / season / class are the first three
            rows of the attribute list a few pixels below it. Base UI still
            wants something to point `aria-describedby` at, so the same line
            stays for a screen reader */}
        <DrawerDescription className="sr-only">
          {objekt.artist} · {objekt.season} · {objekt.class}
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
              {attributes.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-mono">{v}</dd>
                </div>
              ))}
              {owned && (
                <>
                  <dt className="text-muted-foreground">Transferable</dt>
                  <dd>
                    <Badge variant={objekt.transferable ? "success" : "warning"} size="sm">
                      {objekt.transferable ? "Yes" : "No"}
                    </Badge>
                  </dd>
                  <dt className="text-muted-foreground">Received</dt>
                  <dd className="font-mono">
                    {objekt.receivedAt ? format(objekt.receivedAt, "yyyy/MM/dd") : "—"}
                  </dd>
                </>
              )}
            </dl>

            <div className="flex flex-wrap items-center gap-2">
              {/* the website puts this in the tab list; a drawer tab list that
                  navigates away reads as a trap, so it sits with the actions */}
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
                View in Apollo
              </Button>
              {/* the button's own label is the state readout, so the write
                  needs no toast to be visible from inside the drawer */}
              {owned && onToggleLock && (
                <Button variant="outline" size="sm" onClick={onToggleLock}>
                  {locked ? <LockSimpleOpenIcon /> : <LockSimpleIcon />}
                  {locked ? "Unlock" : "Lock"}
                </Button>
              )}
            </div>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(value) => setTab(String(value))}>
          <TabsList
            variant="underline"
            className="bg-popover sticky top-0 z-10 w-full justify-start border-b"
          >
            <TabsTab value="serials">Serials</TabsTab>
            <TabsTab value="market">Market</TabsTab>
            <TabsTab value="metadata">Metadata</TabsTab>
          </TabsList>
          <TabsPanel value="serials">
            <SerialsPanel
              serial={selected}
              serials={serials}
              metadata={metadata}
              offlineSerials={list.error}
              loading={list.loading}
              onSerialChange={setSerial}
            >
              <Timeline
                slug={objekt.slug}
                serial={selected}
                events={events}
                state={transfers}
                offline={offlineTransfers}
                onClose={onClose}
              />
            </SerialsPanel>
          </TabsPanel>
          <TabsPanel value="market">
            <MarketPanel slug={objekt.slug} onOpenSerial={openSerial} onClose={onClose} />
          </TabsPanel>
          <TabsPanel value="metadata">
            <MetadataPanel objekt={objekt} tokenId={tokenId} mintedAt={mintedAt} />
          </TabsPanel>
        </Tabs>
      </DrawerPanel>
    </>
  );
}
