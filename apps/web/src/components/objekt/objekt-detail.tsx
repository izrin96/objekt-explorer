"use client";

import type { SortDescriptor } from "react-aria-components";

import { IconOpenLink } from "@intentui/icons";
import {
  CaretLeftIcon,
  CaretRightIcon,
  LockSimpleIcon,
  PushPinIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useAsyncList } from "@react-stately/data";
import { Addresses } from "@repo/lib";
import { type OwnedObjekt, type ValidObjekt } from "@repo/lib/objekts";
import { format } from "date-fns";
import { ArchiveXIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import NextImage from "next/image";
import { useCallback, useState } from "react";

import { useObjektModal, type ValidTab } from "@/hooks/use-objekt-modal";
import { getObjektImageUrls, isObjektOwned } from "@/lib/objekt-utils";
import { unobtainables } from "@/lib/unobtainables";
import { cn } from "@/utils/classes";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Link } from "../ui/link";
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "../ui/table";
import { Tab, TabList, TabPanel, Tabs } from "../ui/tabs";
import { AttributePanel } from "./objekt-attribute";
import ObjektSidebar from "./objekt-sidebar";
import TradeView from "./trade-view";

type ObjektDetailProps = {
  objekts: ValidObjekt[];
  showOwned?: boolean;
};

export default function ObjektDetail({ objekts, showOwned = false }: ObjektDetailProps) {
  const [objekt] = objekts;
  const urls = getObjektImageUrls(objekt);

  return (
    <div
      className="flex h-full w-full flex-col gap-2 p-2 sm:grid sm:h-134 sm:min-h-134 sm:grid-cols-3 sm:p-3"
      style={
        {
          "--objekt-bg-color": objekt.backgroundColor,
          "--objekt-text-color": objekt.textColor,
        } as Record<string, string>
      }
    >
      <div className="flex h-84 self-center select-none sm:h-fit">
        <ObjektCard urls={urls} objekts={objekts} />
      </div>
      <div className="relative col-span-2 flex min-h-screen flex-col gap-2 overflow-y-auto px-2 sm:-me-2 sm:min-h-full sm:[scrollbar-gutter:stable]">
        <div className="font-semibold">{objekt.collectionId}</div>
        <AttributePanel objekt={objekt} unobtainable={unobtainables.includes(objekt.slug)} />
        <ObjektPanel objekts={objekts} showOwned={showOwned} />
      </div>
    </div>
  );
}

function ObjektPanel({ objekts, showOwned }: { objekts: ValidObjekt[]; showOwned: boolean }) {
  const [objekt] = objekts;
  const t = useTranslations("objekt");
  const isOwned = isObjektOwned(objekt);
  const currentTab = useObjektModal((a) => a.currentTab);
  const setCurrentTab = useObjektModal((a) => a.setCurrentTab);
  const [serial, setSerial] = useState(isOwned ? objekt.serial : null);

  return (
    <Tabs
      aria-label="Objekt tab"
      selectedKey={currentTab}
      onSelectionChange={(key) => setCurrentTab(key.toString() as ValidTab)}
      className="grow pb-2"
    >
      <TabList className="px-2.5">
        {showOwned && (
          <Tab id="owned">
            {t("owned")}
            {objekts.length > 1 ? ` (${objekts.length.toLocaleString()})` : ""}
          </Tab>
        )}
        <Tab id="trades">{t("trades")}</Tab>
        <Tab id="apollo" href={`https://apollo.cafe/?id=${objekt.slug}`} target="_blank">
          <IconOpenLink />
          {t("view_in_apollo")}
        </Tab>
      </TabList>
      {showOwned && (
        <TabPanel id="owned">
          {isOwned ? (
            <OwnedListPanel setSerial={setSerial} objekts={objekts.filter(isObjektOwned)} />
          ) : (
            <div className="flex flex-col items-center justify-center gap-3">
              <ArchiveXIcon strokeWidth={1} size={64} />
              <p>Not owned</p>
            </div>
          )}
        </TabPanel>
      )}
      <TabPanel id="trades">
        <TradeView objekt={objekt} serial={serial} />
      </TabPanel>
    </Tabs>
  );
}

export function ObjektCard({
  objekts,
  urls,
}: {
  objekts: ValidObjekt[];
  urls: ReturnType<typeof getObjektImageUrls>;
}) {
  const [objekt] = objekts;
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className="relative h-full w-full cursor-pointer"
      tabIndex={0}
      role="button"
      onClick={() => setFlipped((prev) => !prev)}
      onKeyDown={() => setFlipped((prev) => !prev)}
    >
      <div
        data-flipped={flipped}
        className="aspect-photocard relative h-full w-full transform-gpu touch-manipulation transition-transform duration-300 will-change-transform transform-3d data-[flipped=true]:rotate-y-180"
      >
        <div className="absolute inset-0 rotate-y-0 drop-shadow backface-hidden">
          {/* smaller image */}
          <NextImage fill loading="eager" src={urls.resizedUrl} alt={objekt.collectionId} />
          {/* original image */}
          <NextImage fill loading="eager" src={urls.originalUrl} alt={objekt.collectionId} />
          <ObjektSidebar objekt={objekt} hideSerial={objekts.length > 1} />
        </div>
        <div className="absolute inset-0 rotate-y-180 drop-shadow backface-hidden">
          <NextImage fill loading="eager" src={urls.backUrl} alt={objekt.collectionId} />
        </div>
      </div>
    </div>
  );
}

const ITEM_PAGE = 10;

function OwnedListPanel({
  objekts,
  setSerial,
}: {
  objekts: OwnedObjekt[];
  setSerial: (serial: number) => void;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const setCurrentTab = useObjektModal((a) => a.setCurrentTab);

  const openTrades = useCallback(
    (serial: number) => {
      setSerial(serial);
      setCurrentTab("trades");
    },
    [setCurrentTab, setSerial],
  );

  const handleSort = useCallback(
    ({ items, sortDescriptor }: { items: OwnedObjekt[]; sortDescriptor: SortDescriptor }) => {
      return items.toSorted((a, b) => {
        let cmp = 0;
        if (sortDescriptor.column === "receivedAt") {
          const aTime = new Date(a.receivedAt).getTime();
          const bTime = new Date(b.receivedAt).getTime();
          if (aTime < bTime) cmp = -1;
          else if (aTime > bTime) cmp = 1;
          else cmp = 0;
        }
        if (sortDescriptor.column === "serial") {
          if (a.serial < b.serial) cmp = -1;
          else if (a.serial > b.serial) cmp = 1;
          else cmp = 0;
        }
        if (sortDescriptor.direction === "descending") cmp *= -1;
        return cmp;
      });
    },
    [],
  );

  const list = useAsyncList<OwnedObjekt>({
    async load() {
      return {
        items: objekts,
        sortDescriptor: {
          column: "receivedAt",
          direction: "descending",
        },
      };
    },
    async sort(params) {
      return {
        items: handleSort(params),
      };
    },
  });

  const totalPages = Math.ceil(list.items.length / ITEM_PAGE);
  const startIndex = (currentPage - 1) * ITEM_PAGE;
  const endIndex = startIndex + ITEM_PAGE;
  const currentItems = list.items.slice(startIndex, endIndex);

  return (
    <div className="flex flex-col gap-2">
      <Card className="py-0">
        <CardContent className="px-3">
          <Table
            className="[--gutter:--spacing(3)]"
            bleed
            aria-label="Trades"
            sortDescriptor={list.sortDescriptor}
            onSortChange={list.sort}
          >
            <TableHeader>
              <TableColumn id="serial" allowsSorting isRowHeader maxWidth={110}>
                Serial
              </TableColumn>
              <TableColumn>Token ID</TableColumn>
              <TableColumn id="receivedAt" allowsSorting minWidth={200}>
                Received
              </TableColumn>
              <TableColumn>Transferable</TableColumn>
            </TableHeader>
            <TableBody>
              {currentItems.map((item) => (
                <TableRow key={item.id} id={item.id}>
                  <TableCell
                    className="flex cursor-pointer items-center gap-2"
                    onClick={() => openTrades(item.serial)}
                  >
                    {item.serial}
                    <div className="flex items-center gap-1">
                      {item.isPin && <PushPinIcon weight="regular" className="size-3" />}
                      {item.isLocked && <LockSimpleIcon weight="regular" className="size-3" />}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`https://opensea.io/item/abstract/${Addresses.OBJEKT}/${item.id}`}
                      className="inline-flex cursor-pointer items-center gap-2"
                      target="_blank"
                    >
                      {item.id}
                      <IconOpenLink />
                    </Link>
                  </TableCell>
                  <TableCell>{format(item.receivedAt, "yyyy/MM/dd hh:mm:ss a")}</TableCell>
                  <TableCell>
                    <Badge
                      className={cn("text-xs")}
                      intent={!item.transferable ? "custom" : "info"}
                    >
                      {item.transferable ? "Yes" : "No"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            size="sq-md"
            intent="outline"
            isDisabled={currentPage <= 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            <CaretLeftIcon />
          </Button>
          <span>
            {currentPage} / {totalPages}
          </span>
          <Button
            size="sq-md"
            intent="outline"
            isDisabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            <CaretRightIcon />
          </Button>
        </div>
      )}
    </div>
  );
}
