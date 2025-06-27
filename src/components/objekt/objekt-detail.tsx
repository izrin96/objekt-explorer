"use client";

import {
  Badge,
  Button,
  Card,
  Link,
  Tab,
  Table,
  TabList,
  TabPanel,
  Tabs,
} from "../ui";
import { CSSProperties, useCallback, useState } from "react";
import {
  OwnedObjekt,
  unobtainables,
  ValidObjekt,
} from "@/lib/universal/objekts";
import ObjektSidebar from "./objekt-sidebar";
import { AttributePanel } from "./objekt-attribute";
import NextImage from "next/image";
import TradeView from "./trade-view";
import { format } from "date-fns";
import { cn } from "@/utils/classes";
import {
  IconChevronLgLeft,
  IconChevronLgRight,
  IconOpenLink,
} from "@intentui/icons";
import { ArchiveXIcon } from "lucide-react";
import { OBJEKT_CONTRACT, replaceUrlSize } from "@/lib/utils";
import { useObjektModal, ValidTab } from "@/hooks/use-objekt-modal";

type ObjektDetailProps = {
  objekts: ValidObjekt[];
  showOwned?: boolean;
};

export default function ObjektDetail({
  objekts,
  showOwned,
}: ObjektDetailProps) {
  const [objekt] = objekts;
  const isOwned = "serial" in objekt;
  const currentTab = useObjektModal((a) => a.currentTab);
  const setCurrentTab = useObjektModal((a) => a.setCurrentTab);
  const [serial, setSerial] = useState(
    "serial" in objekt ? objekt.serial : null
  );

  return (
    <div className="flex flex-col sm:grid sm:grid-cols-3 p-2 sm:p-3 gap-2 h-full sm:h-[33.5rem] sm:min-h-[33.5rem]">
      <ObjektCard objekts={objekts} />
      <div
        className="relative flex flex-col overflow-y-auto col-span-2 min-h-screen sm:min-h-full"
        style={{
          scrollbarGutter: "stable",
        }}
      >
        <div className="px-2 font-semibold">{objekt.collectionId}</div>
        <AttributePanel
          objekt={objekt}
          unobtainable={unobtainables.includes(objekt.slug)}
        />
        <Tabs
          aria-label="Objekt tab"
          selectedKey={currentTab}
          onSelectionChange={(key) => setCurrentTab(key.toString() as ValidTab)}
          className="p-2"
        >
          <TabList>
            {showOwned && (
              <Tab id="owned">
                Owned{objekts.length > 1 ? ` (${objekts.length})` : ""}
              </Tab>
            )}
            <Tab id="trades">Trades</Tab>
            <Tab
              id="apollo"
              href={`https://apollo.cafe/objekts?id=${objekt.slug}`}
              target="_blank"
            >
              <IconOpenLink />
              View in Apollo
            </Tab>
          </TabList>
          {showOwned && (
            <TabPanel id="owned">
              {isOwned ? (
                <OwnedListPanel
                  setSerial={setSerial}
                  objekts={objekts as OwnedObjekt[]}
                />
              ) : (
                <div className="flex flex-col justify-center gap-3 items-center">
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
  const isOwned = "serial" in objekt;
  const [flipped, setFlipped] = useState(false);
  const resizedUrl = replaceUrlSize(objekt.frontImage);
  const css = {
    "--objekt-bg-color": objekt.backgroundColor,
    "--objekt-text-color": objekt.textColor,
  } as CSSProperties;
  return (
    <div
      onClick={() => setFlipped((prev) => !prev)}
      className="flex h-[21rem] sm:h-fit self-center select-none"
      style={css}
    >
      <div
        data-flipped={flipped}
        className="relative w-full h-full aspect-photocard cursor-pointer touch-manipulation transition-transform transform-3d transform-gpu duration-300 data-[flipped=true]:rotate-y-180"
      >
        <div className="absolute inset-0 backface-hidden rotate-y-0 drop-shadow">
          {/* smaller image */}
          <NextImage
            fill
            loading="eager"
            src={resizedUrl}
            alt={objekt.collectionId}
          />
          {/* original image */}
          <NextImage
            fill
            loading="eager"
            src={objekt.frontImage}
            alt={objekt.collectionId}
          />
          {objekt.artist !== "idntt" && (
            <ObjektSidebar
              collection={objekt.collectionNo}
              serial={objekts.length < 2 && isOwned ? objekt.serial : undefined}
            />
          )}
        </div>
        <div className="absolute inset-0 backface-hidden rotate-y-180 drop-shadow">
          {objekt.backImage ? (
            <NextImage
              fill
              loading="eager"
              src={objekt.backImage}
              alt={objekt.collectionId}
            />
          ) : (
            <div className="@container bg-(--objekt-bg-color) text-(--objekt-text-color) w-full h-full rounded-[1rem] flex items-center justify-center overflow-hidden">
              <span className="[transform:rotate(-45deg)] text-[8cqw] font-semibold opacity-60 text-nowrap">
                Back image not available
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OwnedListPanel({
  objekts,
  setSerial,
}: {
  objekts: OwnedObjekt[];
  setSerial: (serial: number) => void;
}) {
  const setCurrentTab = useObjektModal((a) => a.setCurrentTab);
  const openTrades = useCallback(
    (serial: number) => {
      setSerial(serial);
      setCurrentTab("trades");
    },
    [setCurrentTab, setSerial]
  );
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const totalPages = Math.ceil(objekts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = objekts.slice(startIndex, endIndex);

  return (
    <div className="flex flex-col gap-2">
      <Card className="py-0">
        <Card.Content className="px-3">
          <Table className="[--gutter:--spacing(3)]" bleed aria-label="Trades">
            <Table.Header>
              <Table.Column isRowHeader maxWidth={110}>
                Serial
              </Table.Column>
              <Table.Column>Token ID</Table.Column>
              <Table.Column minWidth={200}>Received</Table.Column>
              <Table.Column>Transferable</Table.Column>
            </Table.Header>
            <Table.Body items={currentItems}>
              {(item) => (
                <Table.Row id={item.id}>
                  <Table.Cell>
                    <span
                      onClick={() => openTrades(item.serial)}
                      className="cursor-pointer"
                    >
                      {item.serial}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <Link
                      href={`https://magiceden.io/item-details/abstract/${OBJEKT_CONTRACT}/${item.id}`}
                      className="cursor-pointer inline-flex gap-2 items-center"
                      target="_blank"
                    >
                      {item.id}
                      <IconOpenLink />
                    </Link>
                  </Table.Cell>
                  <Table.Cell>
                    {format(item.receivedAt, "yyyy/MM/dd hh:mm:ss a")}
                  </Table.Cell>
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
              )}
            </Table.Body>
          </Table>
        </Card.Content>
      </Card>
      {totalPages > 1 && (
        <div className="flex gap-3 items-center justify-center">
          <Button
            size="sq-md"
            intent="outline"
            isDisabled={currentPage <= 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            <IconChevronLgLeft />
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
            <IconChevronLgRight />
          </Button>
        </div>
      )}
    </div>
  );
}
