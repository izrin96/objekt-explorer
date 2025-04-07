import { CSSProperties, memo, useCallback } from "react";
import NextImage from "next/image";
import {
  getCollectionShortId,
  OwnedObjekt,
  ValidObjekt,
} from "@/lib/universal/objekts";
import { Badge, Tooltip } from "../ui";
import ObjektSidebar from "./objekt-sidebar";
import { useFilters } from "@/hooks/use-filters";
import { useObjektModal } from "@/hooks/use-objekt-modal";
import { cn } from "@/utils/classes";
import { Star } from "lucide-react";
import { replaceUrlSize } from "@/lib/utils";

type Props = {
  objekts: ValidObjekt[];
  isFade?: boolean;
  priority?: boolean;
  unobtainable?: boolean;
};

export default memo(function ObjektView({
  priority = false,
  isFade = false,
  unobtainable = false,
  ...props
}: Props) {
  const { openObjekts } = useObjektModal();
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
    <div
      className={cn("flex flex-col gap-2", isFade && "opacity-35")}
      style={css}
    >
      <div
        className="cursor-pointer relative overflow-hidden aspect-photocard drop-shadow select-none hover:scale-[1.01] transition duration-150"
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
          serial={isOwned && !filters.grouped ? objekt.serial : undefined}
        />

        {objekts.length > 1 && (
          <div className="flex absolute bottom-2 left-2 rounded-full px-2 py-1 font-bold bg-bg text-fg text-xs">
            {objekts.length}
          </div>
        )}
      </div>
      <div className="flex justify-center text-sm text-center items-center gap-1">
        <Badge
          intent="secondary"
          className="font-semibold cursor-pointer"
          shape="square"
          onClick={onClick}
        >
          {getCollectionShortId(objekt)}
          {isOwned && !filters.grouped && ` #${objekt.serial}`}
        </Badge>
        {unobtainable && (
          <Tooltip delay={0} closeDelay={0}>
            <Tooltip.Trigger aria-label="Unobtainable">
              <Star strokeWidth={3} className="flex-none" size={14} />
            </Tooltip.Trigger>
            <Tooltip.Content>Unobtainable</Tooltip.Content>
          </Tooltip>
        )}
      </div>
    </div>
  );
});
