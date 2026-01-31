import type { ValidObjekt } from "@repo/lib/objekts";

import NextImage from "next/image";
import { type CSSProperties, type PropsWithChildren, useState } from "react";

import { useElementSize } from "@/hooks/use-element-size";
import { getCollectionShortId, isObjektOwned } from "@/lib/objekt-utils";
import { replaceUrlSize } from "@/lib/utils";
import { cn } from "@/utils/classes";

import { Badge } from "../ui/badge";
import { useObjektModal } from "./objekt-modal";
import ObjektSidebar from "./objekt-sidebar";

type Props = PropsWithChildren<{
  objekts: ValidObjekt[];
  isFade?: boolean;
  priority?: boolean;
  unobtainable?: boolean;
  showCount?: boolean;
  showSerial?: boolean;
  isSelected?: boolean;
  hideLabel?: boolean;
}>;

export default function ObjektView({
  objekts,
  priority = false,
  isFade = false,
  unobtainable = false,
  showCount = false,
  showSerial = false,
  isSelected = false,
  hideLabel = false,
  children,
}: Props) {
  const [ref, { width }] = useElementSize();
  const [loaded, setLoaded] = useState(false);
  const [objekt] = objekts;
  const ctx = useObjektModal();

  if (!objekt) return null;

  const css = {
    "--objekt-bg-color": objekt.backgroundColor,
    "--objekt-text-color": objekt.textColor,
    "--width": `${width}px`,
  } as CSSProperties;

  const resizedUrl = replaceUrlSize(objekt.frontImage);

  return (
    <div className={cn("flex flex-col gap-2", isFade && "opacity-35")}>
      <div
        style={css}
        ref={ref}
        className={cn(
          "group grid [&>*]:col-start-1 [&>*]:row-start-1 aspect-photocard cursor-pointer select-none overflow-hidden rounded-[calc(var(--width)*0.054)] shadow-md transition-all",
          "contain-layout contain-paint",
          isSelected && "bg-fg outline-[calc(var(--width)*0.03)]",
          !loaded && "opacity-0",
        )}
      >
        <NextImage
          draggable={false}
          onClick={ctx.handleClick}
          priority={priority}
          className="h-full w-full object-cover"
          src={resizedUrl}
          width={582}
          height={900}
          alt={objekt.collectionId}
          onLoad={() => setLoaded(true)}
        />
        <ObjektSidebar objekt={objekt} hideSerial={!showSerial} />
        {showCount && objekts.length > 1 && (
          <div className="bg-bg text-fg pointer-events-none m-1 flex self-end justify-self-start rounded-full px-2 py-1 text-xs font-bold">
            {objekts.length.toLocaleString()}
          </div>
        )}

        {children}
      </div>
      {!hideLabel && (
        <div className="flex flex-col items-center justify-center gap-1 text-center text-sm">
          <Badge
            intent="secondary"
            className="cursor-pointer font-semibold"
            onClick={ctx.handleClick}
            isCircle={false}
          >
            {getCollectionShortId(objekt)}
            {showSerial && isObjektOwned(objekt) && ` #${objekt.serial}`}
          </Badge>
          {unobtainable && (
            <Badge className="text-xs font-semibold" intent="danger">
              Unobtainable
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
