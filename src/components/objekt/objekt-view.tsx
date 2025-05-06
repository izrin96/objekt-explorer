import { CSSProperties, memo } from "react";
import NextImage from "next/image";
import {
  getCollectionShortId,
  OwnedObjekt,
  ValidObjekt,
} from "@/lib/universal/objekts";
import { Badge, Button } from "../ui";
import ObjektSidebar from "./objekt-sidebar";
import { cn } from "@/utils/classes";
import { replaceUrlSize } from "@/lib/utils";
import { Check } from "@phosphor-icons/react/dist/ssr";

type Props = {
  objekts: ValidObjekt[];
  isFade?: boolean;
  priority?: boolean;
  unobtainable?: boolean;
  showCount?: boolean;
  showSerial?: boolean;
  isSelected?: boolean;
  open: () => void;
  select?: () => void;
};

export default memo(function ObjektView({
  priority = false,
  isFade = false,
  unobtainable = false,
  showCount = false,
  showSerial = false,
  isSelected = false,
  open,
  select,
  ...props
}: Props) {
  const objekts = props.objekts.toSorted(
    (a, b) => (a as OwnedObjekt).serial - (b as OwnedObjekt).serial
  );
  const [objekt] = objekts;
  const isOwned = "serial" in objekt;

  const css = {
    "--objekt-bg-color": objekt.backgroundColor,
    "--objekt-text-color": objekt.textColor,
  } as CSSProperties;

  const resizedUrl = replaceUrlSize(objekt.frontImage);

  return (
    <div
      className={cn("flex flex-col gap-2 @container", isFade && "opacity-35")}
      style={css}
    >
      <div
        className={cn(
          "cursor-pointer relative overflow-hidden aspect-photocard drop-shadow select-none hover:scale-[1.01] transition duration-150 group rounded-[4.5cqw]",
          isSelected && "ring-[3cqw] bg-fg"
        )}
        onClick={open}
      >
        <NextImage
          fill
          priority={priority}
          src={resizedUrl}
          alt={objekt.collectionId}
        />
        {objekt.artist !== "idntt" && (
          <ObjektSidebar
            collection={objekt.collectionNo}
            serial={showSerial && isOwned ? objekt.serial : undefined}
          />
        )}
        {showCount && objekts.length > 1 && (
          <div className="flex absolute bottom-2 left-2 rounded-full px-2 py-1 font-bold bg-bg text-fg text-xs">
            {objekts.length}
          </div>
        )}
        {select && (
          <div
            className={cn("group-hover:block hidden absolute top-0 right-0")}
          >
            <Button
              size="extra-small"
              intent="plain"
              className="bg-bg text-fg group/btn"
              onClick={select}
            >
              <Check size="16" weight="bold" />
              <span
                className={cn(
                  "hidden text-xs font-semibold group-hover/btn:block text-nowrap"
                )}
              >
                {isSelected ? "Unselect" : "Select"}
              </span>
            </Button>
          </div>
        )}
      </div>
      <div className="flex flex-col justify-center text-sm text-center items-center gap-1">
        <Badge
          intent="secondary"
          className="font-semibold cursor-pointer"
          shape="square"
          onClick={open}
        >
          {getCollectionShortId(objekt)}
          {showSerial && isOwned && ` #${objekt.serial}`}
        </Badge>
        {unobtainable && (
          <Badge
            intent="custom"
            shape="square"
            className="font-semibold text-xs"
          >
            Unobtainable
          </Badge>
        )}
      </div>
    </div>
  );
});
