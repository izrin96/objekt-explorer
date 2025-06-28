import NextImage from "next/image";
import { type CSSProperties, memo, type PropsWithChildren } from "react";
import { getCollectionShortId, type OwnedObjekt, type ValidObjekt } from "@/lib/universal/objekts";
import { replaceUrlSize } from "@/lib/utils";
import { cn } from "@/utils/classes";
import { Badge } from "../ui";
import ObjektSidebar from "./objekt-sidebar";

type Props = PropsWithChildren<{
  objekts: ValidObjekt[];
  isFade?: boolean;
  priority?: boolean;
  unobtainable?: boolean;
  showCount?: boolean;
  showSerial?: boolean;
  isSelected?: boolean;
  open: () => void;
}>;

export default memo(function ObjektView({
  priority = false,
  isFade = false,
  unobtainable = false,
  showCount = false,
  showSerial = false,
  isSelected = false,
  open,
  children,
  ...props
}: Props) {
  const objekts = props.objekts.toSorted(
    (a, b) => (a as OwnedObjekt).serial - (b as OwnedObjekt).serial,
  );
  const [objekt] = objekts;
  const isOwned = "serial" in objekt;

  const css = {
    "--objekt-bg-color": objekt.backgroundColor,
    "--objekt-text-color": objekt.textColor,
  } as CSSProperties;

  const resizedUrl = replaceUrlSize(objekt.frontImage);

  return (
    <div className={cn("@container flex flex-col gap-2", isFade && "opacity-35")} style={css}>
      <div
        role="none"
        className={cn(
          "group relative aspect-photocard cursor-pointer select-none overflow-hidden rounded-[4.5cqw] drop-shadow transition duration-150 hover:scale-[1.01]",
          isSelected && "bg-fg ring-[3cqw]",
        )}
        onClick={open}
      >
        <NextImage fill priority={priority} src={resizedUrl} alt={objekt.collectionId} />
        {objekt.artist !== "idntt" && (
          <ObjektSidebar
            collection={objekt.collectionNo}
            serial={showSerial && isOwned ? objekt.serial : undefined}
          />
        )}
        {showCount && objekts.length > 1 && (
          <div className="absolute bottom-1 left-1 flex rounded-full bg-bg px-2 py-1 font-bold text-fg text-xs">
            {objekts.length}
          </div>
        )}

        {children}
      </div>
      <div className="flex flex-col items-center justify-center gap-1 text-center text-sm">
        <Badge
          intent="secondary"
          className="cursor-pointer font-semibold"
          isCircle={false}
          onClick={open}
        >
          {getCollectionShortId(objekt)}
          {showSerial && isOwned && ` #${objekt.serial}`}
        </Badge>
        {unobtainable && (
          <Badge intent="custom" isCircle={false} className="font-semibold text-xs">
            Unobtainable
          </Badge>
        )}
      </div>
    </div>
  );
});
