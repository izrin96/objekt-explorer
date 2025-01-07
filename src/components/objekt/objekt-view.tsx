import { CSSProperties, memo, useCallback } from "react";
import NextImage from "next/image";
import { getCollectionShortId, ValidObjekt } from "@/lib/universal/objekts";
import { OwnedObjekt } from "@/lib/universal/cosmo/objekts";
import { replaceUrlSize } from "./objekt-util";
import { Badge } from "../ui";
import Tilt from "react-parallax-tilt";
import ObjektSidebar from "./objekt-sidebar";
import { useFilters } from "@/hooks/use-filters";
import { useMediaQuery } from "usehooks-ts";
import { useObjektModal } from "@/hooks/use-objekt-modal";

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
  const { openObjekts } = useObjektModal();
  const isDesktop = useMediaQuery("(min-width: 765px)");
  const [filters] = useFilters();
  const objekts = props.objekts.toSorted(
    (a, b) => (a as OwnedObjekt).objektNo - (b as OwnedObjekt).objektNo
  );
  const [objekt] = objekts;

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
    </>
  );
});
