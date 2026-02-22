"use client";

import { ArrowTopRightOnSquareIcon, ArchiveBoxXMarkIcon } from "@heroicons/react/24/outline";
import {
  CaretLeftIcon,
  CaretRightIcon,
  LockSimpleIcon,
  PushPinIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useAsyncList } from "@react-stately/data";
import { Addresses } from "@repo/lib";
import { type OwnedObjekt, type ValidObjekt } from "@repo/lib/types/objekt";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import NextImage from "next/image";
import { Suspense, useCallback, useState } from "react";
import type { SortDescriptor } from "react-aria-components";

import { useElementSize } from "@/hooks/use-element-size";
import { useObjektModal, type ValidTab } from "@/hooks/use-objekt-modal";
import { getObjektImageUrls, isObjektOwned } from "@/lib/objekt-utils";
import { unobtainables } from "@/lib/unobtainables";
import { OBJEKT_SIZE } from "@/lib/utils";

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
  if (!objekt) return null;

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
        <Suspense>
          <AttributePanel objekt={objekt} unobtainable={unobtainables.includes(objekt.slug)} />
        </Suspense>
        <ObjektPanel objekts={objekts} showOwned={showOwned} />
        <div className="flex-1" aria-hidden />
      </div>
    </div>
  );
}

function ObjektPanel({ objekts, showOwned }: { objekts: ValidObjekt[]; showOwned: boolean }) {
  const [objekt] = objekts;
  const t = useTranslations("objekt");
  const currentTab = useObjektModal((a) => a.currentTab);
  const setCurrentTab = useObjektModal((a) => a.setCurrentTab);
  const [serial, setSerial] = useState(() => {
    return objekt && isObjektOwned(objekt) ? objekt.serial : null;
  });

  if (!objekt) return null;

  const isOwned = isObjektOwned(objekt);

  return (
    <Tabs
      aria-label="Objekt tab"
      selectedKey={currentTab}
      onSelectionChange={(key) => setCurrentTab(key.toString() as ValidTab)}
      className="w-full pb-2"
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
          <ArrowTopRightOnSquareIcon className="size-5" />
          {t("view_in_apollo")}
        </Tab>
      </TabList>
      {showOwned && (
        <TabPanel id="owned">
          {isOwned ? (
            <OwnedListPanel setSerial={setSerial} objekts={objekts.filter(isObjektOwned)} />
          ) : (
            <div className="flex flex-col items-center justify-center gap-3">
              <ArchiveBoxXMarkIcon className="size-16" strokeWidth={1} />
              <p>{t("not_owned")}</p>
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
  const [loaded, setLoaded] = useState(false);
  const [backLoaded, setBackLoaded] = useState(false);
  const [ref, { width }] = useElementSize();

  if (!objekt) return null;

  const css = {
    "--width": `${width}px`,
  } as Record<string, string>;

  return (
    <div
      ref={ref}
      style={css}
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
        {/* Front side */}
        <div className="absolute inset-0 grid rotate-y-0 overflow-hidden rounded-[calc(var(--width)*0.054)] shadow-md contain-layout contain-paint backface-hidden [&>*]:col-start-1 [&>*]:row-start-1">
          {/* Progressive loading: show resized first, then original when loaded */}
          <NextImage
            className="h-full w-full object-cover"
            width={OBJEKT_SIZE.width}
            height={OBJEKT_SIZE.height}
            loading="eager"
            src={urls.originalUrl}
            alt={objekt.collectionId}
            onLoad={() => setLoaded(true)}
          />
          {!loaded && (
            <NextImage
              className="h-full w-full object-cover"
              width={582}
              height={900}
              loading="eager"
              src={urls.resizedUrl}
              alt={objekt.collectionId}
            />
          )}
          <ObjektSidebar objekt={objekt} hideSerial={objekts.length > 1} />
        </div>
        {/* Back side */}
        <div className="absolute inset-0 grid rotate-y-180 overflow-hidden rounded-[calc(var(--width)*0.054)] shadow-md contain-layout contain-paint backface-hidden [&>*]:col-start-1 [&>*]:row-start-1">
          <NextImage
            className="h-full w-full object-cover"
            width={OBJEKT_SIZE.width}
            height={OBJEKT_SIZE.height}
            loading="eager"
            src={urls.backUrl}
            alt={objekt.collectionId}
            onLoad={() => setBackLoaded(true)}
          />
          {!backLoaded && (
            <div className="aspect-photocard relative flex size-full bg-white">
              <div className="h-[88%] w-[91%] self-center rounded-r-lg bg-(--objekt-bg-color) p-5"></div>
            </div>
          )}
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
  const t = useTranslations("objekt");
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
        <CardContent className="border-t-0! px-3">
          <Table
            className="[--gutter:--spacing(3)]"
            bleed
            aria-label="Trades"
            sortDescriptor={list.sortDescriptor}
            onSortChange={list.sort}
          >
            <TableHeader>
              <TableColumn id="serial" allowsSorting isRowHeader maxWidth={110}>
                {t("serial")}
              </TableColumn>
              <TableColumn>{t("token_id")}</TableColumn>
              <TableColumn id="receivedAt" allowsSorting minWidth={200}>
                {t("received")}
              </TableColumn>
              <TableColumn>{t("transferable")}</TableColumn>
            </TableHeader>
            <TableBody>
              {currentItems.map((item) => (
                <TableRow key={item.id} id={item.id}>
                  <TableCell className="cursor-pointer" onClick={() => openTrades(item.serial)}>
                    <div className="inline-flex items-center gap-2">
                      {item.serial}
                      {item.isPin && <PushPinIcon weight="regular" className="size-3" />}
                      {item.isLocked && <LockSimpleIcon weight="regular" className="size-3" />}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`https://opensea.io/item/abstract/${Addresses.OBJEKT}/${item.tokenId}`}
                      className="inline-flex cursor-pointer items-center gap-2"
                      target="_blank"
                    >
                      {item.tokenId}
                      <ArrowTopRightOnSquareIcon className="size-4" />
                    </Link>
                  </TableCell>
                  <TableCell>{format(item.receivedAt, "yyyy/MM/dd hh:mm:ss a")}</TableCell>
                  <TableCell>
                    <Badge intent={item.transferable ? "info" : "danger"}>
                      {item.transferable ? t("yes") : t("no")}
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
            onPress={() => setCurrentPage(currentPage - 1)}
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
            onPress={() => setCurrentPage(currentPage + 1)}
          >
            <CaretRightIcon />
          </Button>
        </div>
      )}
    </div>
  );
}
