import { Badge, Card, Table, Tabs } from "../ui";
import { CSSProperties, useState } from "react";
import { replaceUrlSize, getObjektSlug } from "./objekt-util";
import Tilt from "react-parallax-tilt";
import { useObjektModal } from "@/hooks/use-objekt-modal";
import {
  getCollectionShortId,
  OwnedObjekt,
  ValidObjekt,
} from "@/lib/universal/objekts";
import { useMediaQuery } from "usehooks-ts";
import ObjektSidebar from "./objekt-sidebar";
import { AttributePanel } from "./objekt-attribute";
import NextImage from "next/image";
import TradeView from "./trade-view";
import { format } from "date-fns";
import { cn } from "@/utils/classes";

type ObjektDetailProps = {
  isOwned?: boolean;
  objekts: ValidObjekt[];
};

export default function ObjektDetail({
  objekts,
  isOwned = false,
}: ObjektDetailProps) {
  const isDesktop = useMediaQuery("(min-width: 765px)");
  const [objekt] = objekts;
  const [flipped, setFlipped] = useState(false);
  const [hide, setHide] = useState(false);
  const { currentTab, setCurrentTab } = useObjektModal();

  const slug = getObjektSlug(objekt);

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
                serial={(objekt as OwnedObjekt).serial}
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
          <div className="px-2 font-semibold">
            {getCollectionShortId(objekt)}
          </div>
          <AttributePanel objekt={objekt} />
          <Tabs
            aria-label="Objekt tab"
            selectedKey={currentTab}
            onSelectionChange={(key) => setCurrentTab(key.toString())}
            className="p-2"
          >
            <Tabs.List>
              {isOwned && <Tabs.Tab id="owned">Owned</Tabs.Tab>}
              <Tabs.Tab id="trades">Trades</Tabs.Tab>
            </Tabs.List>
            {isOwned && (
              <Tabs.Panel id="owned">
                <OwnedListPanel objekts={objekts as OwnedObjekt[]} />
              </Tabs.Panel>
            )}
            <Tabs.Panel id="trades">
              <TradeView
                slug={slug}
                initialSerial={(objekt as OwnedObjekt).serial}
              />
            </Tabs.Panel>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function OwnedListPanel({ objekts }: { objekts: OwnedObjekt[] }) {
  return (
    <Card>
      <Table allowResize aria-label="Trades">
        <Table.Header>
          <Table.Column isRowHeader isResizable maxWidth={110}>
            Serial
          </Table.Column>
          <Table.Column isResizable minWidth={200}>
            Received
          </Table.Column>
          <Table.Column>Transferable</Table.Column>
        </Table.Header>
        <Table.Body items={objekts}>
          {(item) => (
            <Table.Row id={item.id}>
              <Table.Cell>{item.serial}</Table.Cell>
              <Table.Cell>
                {format(item.receivedAt, "yyyy/MM/dd hh:mm:ss a")}
              </Table.Cell>
              <Table.Cell>
                <Badge
                  className={cn(
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
}
