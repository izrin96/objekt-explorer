import { NumberFormatter } from "@internationalized/number";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useTranslations } from "next-intl";
import NextImage from "next/image";
import { type CSSProperties, type PropsWithChildren, useState } from "react";

import { useElementSize } from "@/hooks/use-element-size";
import { getCollectionShortId, isObjektOwned } from "@/lib/objekt-utils";
import { replaceUrlSize } from "@/lib/utils";
import { cn } from "@/utils/classes";

import { Badge } from "../ui/badge";
import { useObjektModal } from "./objekt-modal";
import ObjektSidebar from "./objekt-sidebar";

function formatListPrice(price: number, currency: string): string {
  try {
    return new NumberFormatter(Intl.DateTimeFormat().resolvedOptions().locale, {
      style: "currency",
      currency,
    }).format(price);
  } catch {
    return `${price.toLocaleString()} ${currency}`;
  }
}

type Props = PropsWithChildren<{
  objekts: ValidObjekt[];
  isFade?: boolean;
  unobtainable?: boolean;
  showCount?: boolean;
  showSerial?: boolean;
  isSelected?: boolean;
  hideLabel?: boolean;
  listCurrency?: string | null;
  onSetPrice?: () => void;
}>;

export default function ObjektView({
  objekts,
  isFade = false,
  unobtainable = false,
  showCount = false,
  showSerial = false,
  isSelected = false,
  hideLabel = false,
  listCurrency,
  children,
  onSetPrice,
}: Props) {
  const t = useTranslations("objekt");
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

  const hasListPrice = objekt.listPrice !== undefined && objekt.listPrice !== null;
  const resizedUrl = replaceUrlSize(objekt.frontImage);

  const showBottomContent = !hideLabel || objekt.isQyop || hasListPrice || unobtainable;

  return (
    <div className={cn("flex flex-col gap-2", isFade && "opacity-35")} style={css}>
      <div
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
          className="h-full w-full object-cover"
          src={resizedUrl}
          width={582}
          height={900}
          alt={objekt.collectionId}
          onLoad={() => setLoaded(true)}
          fetchPriority="high"
        />
        <ObjektSidebar objekt={objekt} hideSerial={!showSerial} />
        {showCount && objekts.length > 1 && (
          <div className="bg-bg text-fg pointer-events-none m-1 flex self-end justify-self-start rounded-full px-1.5 py-0.5 text-[0.6rem] font-semibold sm:px-2 sm:py-1 sm:text-xs">
            {objekts.length.toLocaleString()}
          </div>
        )}

        {children}
      </div>
      {showBottomContent && (
        <div className="flex flex-col items-center justify-center gap-1 text-center text-sm">
          {objekt.isQyop ? (
            <Badge
              intent="secondary"
              className={cn("font-semibold", onSetPrice && "cursor-pointer")}
              onClick={onSetPrice}
            >
              QYOP
            </Badge>
          ) : (
            hasListPrice &&
            listCurrency && (
              <Badge
                intent="outline"
                className={cn(
                  "bg-(--objekt-bg-color) font-semibold text-(--objekt-text-color)",
                  onSetPrice && "cursor-pointer",
                )}
                onClick={onSetPrice}
              >
                {formatListPrice(objekt.listPrice!, listCurrency)}
              </Badge>
            )
          )}

          {!hideLabel && (
            <Badge
              intent="secondary"
              className="text-fg bg-muted cursor-pointer text-[0.65rem] sm:text-xs"
              onClick={ctx.handleClick}
              isCircle={false}
            >
              {getCollectionShortId(objekt)}
              {showSerial && isObjektOwned(objekt) && ` #${objekt.serial}`}
            </Badge>
          )}

          {unobtainable && (
            <Badge intent="danger" isCircle={false}>
              {t("unobtainable")}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
