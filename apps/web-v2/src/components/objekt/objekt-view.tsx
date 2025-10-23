import { type CSSProperties, type PropsWithChildren, useState } from "react";
import { useElementSize } from "@/hooks/use-element-size";
import { getCollectionShortId, isObjektOwned } from "@/lib/objekt-utils";
import type { ValidObjekt } from "@/lib/universal/objekts";
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
  isFade = false,
  priority = false,
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
          "group relative aspect-photocard cursor-pointer select-none overflow-hidden rounded-[calc(var(--width)*0.054)] drop-shadow transition-all",
          isSelected && "bg-fg outline-[calc(var(--width)*0.03)]",
          !loaded && "opacity-0",
        )}
      >
        <img
          fetchPriority={priority ? "high" : "auto"}
          onClick={ctx.handleClick}
          onKeyUp={ctx.handleClick}
          draggable={false}
          src={resizedUrl}
          alt={objekt.collectionId}
          onLoad={() => setLoaded(true)}
          className="absolute inset-0 size-full"
        />
        <ObjektSidebar objekt={objekt} hideSerial={!showSerial} />
        {showCount && objekts.length > 1 && (
          <div className="pointer-events-none absolute bottom-1 left-1 flex rounded-full bg-bg px-2 py-1 font-bold text-fg text-xs">
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
          >
            {getCollectionShortId(objekt)}
            {showSerial && isObjektOwned(objekt) && ` #${objekt.serial}`}
          </Badge>
          {unobtainable && (
            <Badge intent="custom" className="font-semibold text-xs">
              Unobtainable
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
