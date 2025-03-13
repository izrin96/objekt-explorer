import { Badge, Button, Card, Link, NumberField, Table, Tabs } from "../ui";
import { CSSProperties, memo, useState } from "react";
import { replaceUrlSize } from "./objekt-util";
import { useObjektModal, ValidTab } from "@/hooks/use-objekt-modal";
import { OwnedObjekt, ValidObjekt } from "@/lib/universal/objekts";
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
} from "justd-icons";
import { ArchiveXIcon } from "lucide-react";
import { useCosmoArtist } from "@/hooks/use-cosmo-artist";

type ObjektDetailProps = {
  objekts: ValidObjekt[];
  isProfile?: boolean;
};

export default function ObjektDetail({
  objekts,
  isProfile,
}: ObjektDetailProps) {
  const [objekt] = objekts;
  const isOwned = "serial" in objekt;
  const [flipped, setFlipped] = useState(false);
  const [hide, setHide] = useState(false);
  const { currentTab, setCurrentTab } = useObjektModal();

  const resizedUrl = replaceUrlSize(objekt.frontImage);

  const css = {
    "--objekt-accent-color": objekt.accentColor,
    "--objekt-text-color": objekt.textColor,
  } as CSSProperties;

  return (
    <div className="flex flex-col sm:grid sm:grid-cols-3 p-2 sm:p-3 gap-2 h-full sm:h-[33.5rem]">
      <div
        onClick={() => setFlipped((prev) => !prev)}
        className="flex h-[21rem] sm:h-fit self-center select-none"
        style={css}
      >
        <div
          data-flipped={flipped}
          className="relative w-full h-full aspect-photocard cursor-pointer touch-manipulation transition-transform transform-3d transform-gpu duration-300 data-[flipped=true]:rotate-y-180"
        >
          <div className="absolute inset-0 backface-hidden drop-shadow">
            <NextImage
              fill
              loading="eager"
              src={resizedUrl}
              alt={objekt.collectionId}
              hidden={hide}
            />
            <NextImage
              fill
              loading="eager"
              onLoad={() => setHide(true)}
              src={objekt.frontImage}
              alt={objekt.collectionId}
            />
            <ObjektSidebar
              collection={objekt.collectionNo}
              serial={isOwned ? objekt.serial : undefined}
            />
          </div>
          <div className="absolute inset-0 backface-hidden rotate-y-180 drop-shadow">
            <NextImage
              fill
              loading="eager"
              src={objekt.backImage}
              alt={objekt.collectionId}
            />
          </div>
        </div>
      </div>

      <div
        className="flex flex-col overflow-y-auto col-span-2 min-h-screen sm:min-h-full"
        style={{
          scrollbarGutter: "stable",
        }}
      >
        <div className="px-2 font-semibold">{objekt.collectionId}</div>
        <AttributePanel objekt={objekt} />
        <Tabs
          aria-label="Objekt tab"
          selectedKey={currentTab}
          onSelectionChange={(key) => setCurrentTab(key.toString() as ValidTab)}
          className="p-2"
        >
          <Tabs.List>
            {isProfile && (
              <Tabs.Tab id="owned">
                Owned{objekts.length > 1 ? ` (${objekts.length})` : ""}
              </Tabs.Tab>
            )}
            <Tabs.Tab id="trades">Trades</Tabs.Tab>
            <Tabs.Tab
              id="apollo"
              href={`https://apollo.cafe/objekts?id=${objekt.slug}`}
              target="_blank"
            >
              <IconOpenLink />
              View in Apollo
            </Tabs.Tab>
          </Tabs.List>
          {isProfile && (
            <Tabs.Panel id="owned">
              {isOwned ? (
                <OwnedListPanel objekts={objekts as OwnedObjekt[]} />
              ) : (
                <div className="flex flex-col justify-center gap-3 items-center">
                  <ArchiveXIcon strokeWidth="1.2" size="64" />
                  <p>Not owned</p>
                </div>
              )}
            </Tabs.Panel>
          )}
          <Tabs.Panel id="trades">
            <TradeView objekt={objekt} />
          </Tabs.Panel>
        </Tabs>
      </div>
    </div>
  );
}

const OwnedListPanel = memo(function OwnedListPanel({
  objekts,
}: {
  objekts: OwnedObjekt[];
}) {
  const { openTrades } = useObjektModal();
  const { getArtist } = useCosmoArtist();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const totalPages = Math.ceil(objekts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = objekts.slice(startIndex, endIndex);

  return (
    <div className="flex flex-col gap-2">
      <Card>
        <Table aria-label="Trades">
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
                    href={`https://opensea.io/assets/matic/${
                      getArtist(item.artist)?.contracts.Objekt
                    }/${item.id}`}
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
                    intent={!item.transferable ? "custom" : "primary"}
                    shape="square"
                  >
                    {item.transferable ? "Yes" : "No"}
                  </Badge>
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table>
      </Card>
      {totalPages > 1 && (
        <div className="flex gap-3 items-center justify-center">
          <Button
            size="square-petite"
            intent="outline"
            isDisabled={currentPage <= 1}
            onPress={() => setCurrentPage(currentPage - 1)}
          >
            <IconChevronLgLeft />
          </Button>
          <NumberField
            className="max-w-16"
            minValue={1}
            maxValue={totalPages}
            aria-label="Page"
            value={currentPage}
            onChange={setCurrentPage}
            isWheelDisabled
          />
          <span>/ {totalPages}</span>
          <Button
            size="square-petite"
            intent="outline"
            isDisabled={currentPage >= totalPages}
            onPress={() => setCurrentPage(currentPage + 1)}
          >
            <IconChevronLgRight />
          </Button>
        </div>
      )}
    </div>
  );
});
