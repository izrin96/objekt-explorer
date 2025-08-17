"use client";

import { IconOpenLink } from "@intentui/icons";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react/dist/ssr";
import { useAsyncList } from "@react-stately/data";
import { format } from "date-fns";
import { ArchiveXIcon } from "lucide-react";
import NextImage from "next/image";
import { useTranslations } from "next-intl";
import { type CSSProperties, useCallback, useState } from "react";
import type { SortDescriptor } from "react-aria-components";
import { useObjektModal, type ValidTab } from "@/hooks/use-objekt-modal";
import { type OwnedObjekt, unobtainables, type ValidObjekt } from "@/lib/universal/objekts";
import { OBJEKT_CONTRACT, replaceUrlSize } from "@/lib/utils";
import { cn } from "@/utils/classes";
import { Badge, Button, Card, Link, Tab, TabList, Table, TabPanel, Tabs } from "../ui";
import { AttributePanel } from "./objekt-attribute";
import ObjektSidebar from "./objekt-sidebar";
import TradeView from "./trade-view";

type ObjektDetailProps = {
  objekts: ValidObjekt[];
  showOwned?: boolean;
  onClose: () => void;
};

export default function ObjektDetail({ objekts, showOwned = false, onClose }: ObjektDetailProps) {
  const t = useTranslations("objekt");
  const [objekt] = objekts;
  const isOwned = "serial" in objekt;
  const currentTab = useObjektModal((a) => a.currentTab);
  const setCurrentTab = useObjektModal((a) => a.setCurrentTab);
  const [serial, setSerial] = useState("serial" in objekt ? objekt.serial : null);

  return (
    <div className="flex h-full w-screen flex-col gap-2 p-2 sm:grid sm:h-[33.5rem] sm:min-h-[33.5rem] sm:w-full sm:grid-cols-3 sm:p-3">
      <ObjektCard objekts={objekts} />
      <div
        className="relative col-span-2 flex min-h-screen flex-col overflow-y-auto sm:min-h-full"
        style={{
          scrollbarGutter: "stable",
        }}
      >
        <div className="px-2 font-semibold">{objekt.collectionId}</div>
        <AttributePanel objekt={objekt} unobtainable={unobtainables.includes(objekt.slug)} />
        <Tabs
          aria-label="Objekt tab"
          selectedKey={currentTab}
          onSelectionChange={(key) => setCurrentTab(key.toString() as ValidTab)}
          className="p-2"
        >
          <TabList>
            {showOwned && (
              <Tab id="owned">
                {t("owned")}
                {objekts.length > 1 ? ` (${objekts.length})` : ""}
              </Tab>
            )}
            <Tab id="trades">{t("trades")}</Tab>
            <Tab id="apollo" href={`https://apollo.cafe/objekts?id=${objekt.slug}`} target="_blank">
              <IconOpenLink />
              {t("view_in_apollo")}
            </Tab>
          </TabList>
          {showOwned && (
            <TabPanel id="owned">
              {isOwned ? (
                <OwnedListPanel setSerial={setSerial} objekts={objekts as OwnedObjekt[]} />
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
      </div>
    </div>
  );
}

function ObjektCard({ objekts }: { objekts: ValidObjekt[] }) {
  const [objekt] = objekts;
  const [flipped, setFlipped] = useState(false);
  const resizedUrl = replaceUrlSize(objekt.frontImage);
  const css = {
    "--objekt-bg-color": objekt.backgroundColor,
    "--objekt-text-color": objekt.textColor,
  } as CSSProperties;
  return (
    <div
      role="none"
      onClick={() => setFlipped((prev) => !prev)}
      className="flex h-[21rem] select-none self-center sm:h-fit"
      style={css}
    >
      <div
        data-flipped={flipped}
        className="transform-3d relative aspect-photocard h-full w-full transform-gpu cursor-pointer touch-manipulation transition-transform duration-300 data-[flipped=true]:rotate-y-180"
      >
        <div className="backface-hidden absolute inset-0 rotate-y-0 drop-shadow">
          {/* smaller image */}
          <NextImage fill loading="eager" src={resizedUrl} alt={objekt.collectionId} />
          {/* original image */}
          <NextImage fill loading="eager" src={objekt.frontImage} alt={objekt.collectionId} />
          <ObjektSidebar objekt={objekt} hideSerial={objekts.length > 1} />
        </div>
        <div className="backface-hidden absolute inset-0 rotate-y-180 drop-shadow">
          <NextImage fill loading="eager" src={objekt.backImage} alt={objekt.collectionId} />
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
      return items.sort((a, b) => {
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
        items: handleSort({
          items: objekts,
          sortDescriptor: { column: "receivedAt", direction: "descending" },
        }),
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
        <Card.Content className="px-3">
          <Table
            className="[--gutter:--spacing(3)]"
            bleed
            aria-label="Trades"
            sortDescriptor={list.sortDescriptor}
            onSortChange={list.sort}
          >
            <Table.Header>
              <Table.Column id="serial" allowsSorting isRowHeader maxWidth={110}>
                Serial
              </Table.Column>
              <Table.Column>Token ID</Table.Column>
              <Table.Column id="receivedAt" allowsSorting minWidth={200}>
                Received
              </Table.Column>
              <Table.Column>Transferable</Table.Column>
            </Table.Header>
            <Table.Body>
              {currentItems.map((item) => (
                <Table.Row key={item.id} id={item.id}>
                  <Table.Cell className="cursor-pointer" onClick={() => openTrades(item.serial)}>
                    {item.serial}
                  </Table.Cell>
                  <Table.Cell>
                    <Link
                      href={`https://opensea.io/item/abstract/${OBJEKT_CONTRACT}/${item.id}`}
                      className="inline-flex cursor-pointer items-center gap-2"
                      target="_blank"
                    >
                      {item.id}
                      <IconOpenLink />
                    </Link>
                  </Table.Cell>
                  <Table.Cell>{format(item.receivedAt, "yyyy/MM/dd hh:mm:ss a")}</Table.Cell>
                  <Table.Cell>
                    <Badge
                      className={cn("text-xs")}
                      intent={!item.transferable ? "custom" : "info"}
                      isCircle={false}
                    >
                      {item.transferable ? "Yes" : "No"}
                    </Badge>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </Card.Content>
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
