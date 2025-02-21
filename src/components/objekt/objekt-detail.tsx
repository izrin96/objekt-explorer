import { Badge, Card, Link, Table, Tabs } from "../ui";
import { CSSProperties, memo, useState } from "react";
import { replaceUrlSize } from "./objekt-util";
import Tilt from "react-parallax-tilt";
import { useObjektModal, ValidTab } from "@/hooks/use-objekt-modal";
import { OwnedObjekt, ValidObjekt } from "@/lib/universal/objekts";
import { useMediaQuery } from "usehooks-ts";
import ObjektSidebar from "./objekt-sidebar";
import { AttributePanel } from "./objekt-attribute";
import NextImage from "next/image";
import TradeView from "./trade-view";
import { format } from "date-fns";
import { cn } from "@/utils/classes";
import { IconOpenLink } from "justd-icons";
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
  const isDesktop = useMediaQuery("(min-width: 640px)");
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
    <div className="flex flex-col sm:flex-row p-2 sm:p-3 gap-2">
      <div
        onClick={() => setFlipped((prev) => !prev)}
        className="flex h-[21rem] sm:h-[32rem] aspect-photocard self-center flex-none select-none"
        style={css}
      >
        <Tilt
          tiltReverse
          transitionSpeed={1000}
          tiltEnable={isDesktop}
          tiltMaxAngleX={3}
          tiltMaxAngleY={3}
        >
          <div
            data-flipped={flipped}
            className="relative h-full aspect-photocard cursor-pointer touch-manipulation transition-transform transform-3d transform-gpu duration-300 data-[flipped=true]:rotate-y-180"
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
        </Tilt>
      </div>

      <div className="flex flex-col h-full min-h-screen sm:min-h-full sm:h-[32rem]">
        <div className="overflow-y-auto">
          <div className="px-2 font-semibold">{objekt.collectionId}</div>
          <AttributePanel objekt={objekt} />
          <Tabs
            aria-label="Objekt tab"
            selectedKey={currentTab}
            onSelectionChange={(key) =>
              setCurrentTab(key.toString() as ValidTab)
            }
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
  return (
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
        <Table.Body items={objekts}>
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
                  className={cn(
                    "text-xs",
                    !item.transferable &&
                      "bg-pink-500/15 text-pink-700 dark:bg-pink-500/10 dark:text-pink-300"
                  )}
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
  );
});
