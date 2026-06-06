import { NumberFormatter } from "@internationalized/number";
import { NoteIcon } from "@phosphor-icons/react/dist/ssr";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { type CSSProperties, type PropsWithChildren, useState } from "react";

import { getCollectionShortId, isObjektOwned } from "@/lib/objekt-utils";
import { replaceUrlSize, cn, getClientLocale } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { Badge } from "../intentui/badge";
import { Button } from "../intentui/button";
import { Popover, PopoverContent } from "../intentui/popover";
import { useObjektModal } from "./objekt-modal";
import ObjektSidebar from "./objekt-sidebar";

function formatPrice(price: number, currency: string): string {
  try {
    return new NumberFormatter(getClientLocale(), {
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
  isPriority?: boolean;
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
  isPriority = false,
  listCurrency,
  children,
  onSetPrice,
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const [objekt] = objekts;
  const ctx = useObjektModal();

  if (!objekt) return null;

  const css = {
    "--objekt-bg-color": objekt.backgroundColor,
    "--objekt-text-color": objekt.textColor,
  } as CSSProperties;

  const resizedUrl = replaceUrlSize(objekt.frontImage);

  const hasPrice = objekt.price !== undefined && objekt.price !== null;
  const showPriceContent =
    listCurrency && (objekt.isQyop || hasPrice || objekt.note || onSetPrice !== undefined);
  const showBottomContent = !hideLabel || unobtainable || showPriceContent;

  return (
    <div className={cn("flex flex-col gap-2", isFade && "opacity-35")} style={css}>
      <div className="@container">
        <div
          className={cn(
            "group grid [&>*]:col-start-1 [&>*]:row-start-1 aspect-photocard cursor-pointer select-none overflow-hidden rounded-photocard bg-overlay shadow-md",
            "contain-layout contain-paint",
            isSelected && "bg-fg outline-[calc(100cqi*0.034)]",
          )}
        >
          <img
            draggable={false}
            onClick={ctx.handleClick}
            className={cn(
              "size-full object-cover transition-opacity -z-10",
              !loaded && "opacity-0",
            )}
            src={resizedUrl}
            width={582}
            height={900}
            alt={objekt.collectionId}
            onLoad={() => setLoaded(true)}
            fetchPriority={isPriority ? "high" : "auto"}
            loading={isPriority ? "eager" : "lazy"}
            decoding="async"
          />
          <ObjektSidebar objekt={objekt} hideSerial={!showSerial} />
          {showCount && objekts.length > 1 && (
            <div className="bg-bg text-fg text-xxs pointer-events-none m-1 flex self-end justify-self-start overflow-hidden rounded-full px-1.5 py-0.5 font-medium sm:px-2 sm:py-1 sm:text-xs">
              {objekts.length.toLocaleString()}
            </div>
          )}

          {children}
        </div>
      </div>
      {showBottomContent && (
        <div className="flex flex-col items-center justify-center gap-1 text-center">
          {showPriceContent ? (
            <div className="flex flex-wrap items-center justify-center gap-0.5">
              {objekt.isQyop ? (
                <Badge
                  intent="secondary"
                  className={cn("text-xxs sm:text-xs", onSetPrice && "cursor-pointer")}
                  onClick={onSetPrice}
                >
                  {m.objekt_qyop()}
                </Badge>
              ) : hasPrice ? (
                <Badge
                  intent="secondary"
                  className={cn(
                    "text-xxs sm:text-xs bg-fg text-bg",
                    onSetPrice && "cursor-pointer",
                  )}
                  onClick={onSetPrice}
                >
                  {formatPrice(objekt.price!, listCurrency)}
                </Badge>
              ) : (
                onSetPrice && (
                  <Badge
                    intent="secondary"
                    className="text-xxs cursor-pointer sm:text-xs"
                    onClick={onSetPrice}
                  >
                    {m.objekt_set_price()}
                  </Badge>
                )
              )}
              {objekt.note && (
                <Popover>
                  <Button isCircle intent="plain" size="sq-sm" aria-label={m.objekt_note_aria()}>
                    <NoteIcon />
                  </Button>
                  <PopoverContent arrow className="max-w-72">
                    <div className="p-3 text-sm">
                      <span className="text-muted-fg">{m.objekt_note()}: </span>
                      <span className="text-fg">{objekt.note}</span>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          ) : null}

          {!hideLabel && (
            <Badge
              intent="secondary"
              className="text-fg bg-muted text-xxs cursor-pointer sm:text-xs"
              onClick={ctx.handleClick}
              isCircle={false}
            >
              {getCollectionShortId(objekt)}
              {showSerial && isObjektOwned(objekt) && ` #${objekt.serial}`}
            </Badge>
          )}

          {unobtainable && (
            <Badge intent="danger" className="text-xxs sm:text-xs">
              {m.objekt_unobtainable()}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
