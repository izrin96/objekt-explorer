import {
  CSSProperties,
  memo,
  useCallback,
  useState,
  useTransition,
} from "react";
import NextImage from "next/image";
import { getCollectionShortId, ValidObjekt } from "@/lib/universal/objekts";
import { OwnedObjekt } from "@/lib/universal/cosmo/objekts";
import { getObjektSlug, replaceUrlSize } from "./objekt-util";
import { Badge, GridList, Tabs, Modal } from "../ui";
import Tilt from "react-parallax-tilt";
import TradeView from "./trade-view";
import ObjektSidebar from "./objekt-sidebar";
import { useFilters } from "@/hooks/use-filters";
import { useObjektModal } from "@/hooks/use-objekt-modal";
import { useMediaQuery } from "usehooks-ts";
import { AttributePanel } from "./objekt-attribute";

type Props = {
  objekts: ValidObjekt[];
  isOwned?: boolean;
  priority?: boolean;
  setActive?: (slug: string | null) => void;
};

export default memo(function ObjektView({
  isOwned = false,
  priority = false,
  setActive,
  ...props
}: Props) {
  const isDesktop = useMediaQuery("(min-width: 765px)");
  const [filters] = useFilters();
  const objekts = props.objekts
    .map((objekt) => objekt as OwnedObjekt)
    .toSorted((a, b) => a.objektNo - b.objektNo);
  const [objekt] = objekts;
  const [open, setOpen] = useState(false);
  const [_, startTransition] = useTransition();

  const css = {
    "--objekt-accent-color": objekt.accentColor,
    "--objekt-text-color": objekt.textColor,
  } as CSSProperties;

  const slug = getObjektSlug(objekt);

  const resizedUrl = replaceUrlSize(objekt.frontImage);

  const onClick = useCallback(() => {
    startTransition(() => {
      setOpen(true);
      if (setActive) {
        setActive(slug);
      }
    });
  }, [setOpen, setActive, slug]);

  return (
    <>
      <div className="flex flex-col gap-2" style={css}>
        <Tilt
          tiltEnable={isDesktop}
          tiltReverse
          scale={isDesktop ? 1.06 : undefined}
          transitionSpeed={1000}
          tiltMaxAngleX={10}
          tiltMaxAngleY={10}
          glareEnable={isDesktop}
          glareMaxOpacity={0.2}
          glarePosition={isDesktop ? "bottom" : undefined}
          glareBorderRadius={isDesktop ? "12px" : undefined}
        >
          <div
            className="cursor-pointer relative overflow-hidden aspect-photocard drop-shadow"
            onClick={onClick}
          >
            <NextImage
              fill
              priority={priority}
              src={resizedUrl}
              alt={objekt.collectionId}
            />

            <ObjektSidebar
              collection={objekt.collectionNo}
              serial={(objekt as OwnedObjekt).objektNo}
            />

            {objekts.length > 1 && (
              <div className="flex absolute bottom-2 left-2 rounded-full px-2 py-1 font-bold bg-bg text-fg text-xs">
                {objekts.length}
              </div>
            )}
          </div>
        </Tilt>
        <div className="flex justify-center text-sm text-center">
          <Badge
            intent="secondary"
            className="font-semibold cursor-pointer"
            shape="square"
            onClick={onClick}
          >
            {getCollectionShortId(objekt)}
            {isOwned &&
              !filters.grouped &&
              ` #${(objekt as OwnedObjekt).objektNo}`}
          </Badge>
        </div>
      </div>

      <ObjektModal
        open={open}
        isOwned={isOwned}
        objekts={objekts}
        onClose={() => {
          startTransition(() => {
            setOpen(false);
            if (setActive) {
              setActive(null);
            }
          });
        }}
      />
    </>
  );
});

type ObjektModalProps = {
  open: boolean;
  objekts: ValidObjekt[];
  onClose?: () => void;
  isOwned?: boolean;
};

export function ObjektModal({
  open,
  objekts,
  onClose,
  isOwned = false,
}: ObjektModalProps) {
  return (
    <Modal.Content
      isOpen={open}
      onOpenChange={(state) => {
        if (state === false && onClose) {
          onClose();
        }
      }}
      size="5xl"
    >
      <Modal.Header className="hidden">
        <Modal.Title>Objekt display</Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-0 sm:p-0 overflow-y-auto sm:overflow-y-hidden">
        <ObjektDetail isOwned={isOwned} objekts={objekts} />
      </Modal.Body>
    </Modal.Content>
  );
}

type ObjektDetailProps = {
  isOwned?: boolean;
  objekts: ValidObjekt[];
};

function ObjektDetail({ objekts, isOwned = false }: ObjektDetailProps) {
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
                serial={(objekt as OwnedObjekt).objektNo}
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
                initialSerial={(objekt as OwnedObjekt).objektNo}
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
    <GridList
      items={objekts}
      aria-label="Select objekt"
      selectionMode="multiple"
      className="min-w-64 max-h-full"
    >
      {(item) => (
        <GridList.Item textValue={`${item.objektNo}`} id={item.tokenId}>
          #{item.objektNo}
        </GridList.Item>
      )}
    </GridList>
  );
}
