import { CSSProperties, memo, useCallback } from "react";
import NextImage from "next/image";
import {
  getCollectionShortId,
  OwnedObjekt,
  ValidObjekt,
} from "@/lib/universal/objekts";
import { replaceUrlSize } from "./objekt-util";
import { Badge } from "../ui";
import Tilt from "react-parallax-tilt";
import ObjektSidebar from "./objekt-sidebar";
import { useFilters } from "@/hooks/use-filters";
import { useMediaQuery } from "usehooks-ts";
import { useObjektModal } from "@/hooks/use-objekt-modal";
import { cn } from "@/utils/classes";

type Props = {
  objekts: ValidObjekt[];
  priority?: boolean;
  setActive?: (slug: string | null) => void;
  isProfile?: boolean;
};

export default memo(function ObjektView({
  priority = false,
  setActive,
  isProfile = false,
  ...props
}: Props) {
  const { openObjekts } = useObjektModal();
  const isDesktop = useMediaQuery("(min-width: 640px)");
  const [filters] = useFilters();
  const objekts = props.objekts.toSorted(
    (a, b) => (a as OwnedObjekt).serial - (b as OwnedObjekt).serial
  );
  const [objekt] = objekts;
  const isOwned = "serial" in objekt;

  const css = {
    "--objekt-accent-color": objekt.accentColor,
    "--objekt-text-color": objekt.textColor,
  } as CSSProperties;

  const resizedUrl = replaceUrlSize(objekt.frontImage);

  const onClick = useCallback(
    () => openObjekts(objekts),
    [openObjekts, objekts]
  );

  return (
    <>
      <div
        className={cn(
          "flex flex-col gap-2",
          isProfile && !isOwned && "opacity-50"
        )}
        style={css}
      >
        <Tilt
          tiltEnable={isDesktop}
          tiltReverse
          scale={isDesktop ? 1.03 : undefined}
          transitionSpeed={500}
          tiltMaxAngleX={4}
          tiltMaxAngleY={4}
          glareEnable={isDesktop}
          glareMaxOpacity={0.1}
          glarePosition={isDesktop ? "bottom" : undefined}
          glareBorderRadius={isDesktop ? "12px" : undefined}
        >
          <div
            className="cursor-pointer relative overflow-hidden aspect-photocard drop-shadow select-none"
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
              serial={(objekt as OwnedObjekt).serial}
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
              ` #${(objekt as OwnedObjekt).serial}`}
          </Badge>
        </div>
      </div>
    </>
  );
});
