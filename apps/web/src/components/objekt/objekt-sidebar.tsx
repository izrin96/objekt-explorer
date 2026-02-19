import type { ValidObjekt } from "@repo/lib/types/objekt";
import Image from "next/image";
import { useRef, useState } from "react";

import { isObjektOwned } from "@/lib/objekt-utils";
import { OBJEKT_SIZE } from "@/lib/utils";

const { width: CANVAS_W, height: CANVAS_H } = OBJEKT_SIZE;

const band = {
  w: CANVAS_W * 0.11,
  h: CANVAS_H * 0.885,
  x: CANVAS_W - CANVAS_W * 0.11,
  y: (CANVAS_H - CANVAS_H * 0.885) / 2,
  cx: CANVAS_W - CANVAS_W * 0.11 + (CANVAS_W * 0.11) / 2,
  r: 46,
} as const;

const bandPath = `M${band.r} 0H${band.w}V${band.h}H${band.r}Q0 ${band.h} 0 ${band.h - band.r}V${band.r}Q0 0 ${band.r} 0Z`;

const memberY = 148;
const collectionY = CANVAS_H / 2;
const logo = { x: band.cx + 26, y: band.h - 92, scale: 0.33 } as const;

type Props = {
  objekt: ValidObjekt;
  hideSerial?: boolean;
};

export default function ObjektSidebar(props: Props) {
  const ref = useRef<HTMLImageElement>(null);
  const [offsetPx, setOffsetPx] = useState(0);
  const { objekt } = props;

  const handleImageLoad = () => {
    if (ref.current) {
      const offset = ref.current.naturalWidth - CANVAS_W;
      if (offset > 0) {
        setOffsetPx(offset);
      }
    }
  };

  return (
    <div className="pointer-events-none grid h-full w-full items-center text-(--objekt-text-color) select-none [&>*]:col-start-1 [&>*]:row-start-1">
      {/* custom band image */}
      {objekt.bandImageUrl && (
        <Image
          ref={ref}
          onLoad={handleImageLoad}
          className="h-full w-full object-cover"
          style={offsetPx > 0 ? { marginLeft: `${offsetPx}px` } : undefined}
          alt="band image"
          src={objekt.bandImageUrl}
          width={CANVAS_W}
          height={CANVAS_H}
        />
      )}
      <SidebarBand {...props} />
    </div>
  );
}

export function SidebarBand({ objekt, hideSerial = false }: Props) {
  const isIdntt = objekt.artist === "idntt";

  return (
    <svg
      width={CANVAS_W}
      height={CANVAS_H}
      viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full"
    >
      {/* band background */}
      {isIdntt && !objekt.bandImageUrl && (
        <path
          d={bandPath}
          transform={`translate(${band.x},${band.y})`}
          fill={objekt.backgroundColor}
        />
      )}

      {/* member name */}
      {isIdntt && (
        <text
          x={band.cx}
          y={memberY}
          fill="currentColor"
          textAnchor="start"
          dy=".33em"
          fontSize="3.4em"
          className="font-semibold"
          transform={`rotate(90 ${band.cx} ${memberY})`}
        >
          {objekt.member}
        </text>
      )}

      {/* collection no. and serial */}
      <text
        x={band.cx}
        y={collectionY}
        fill="currentColor"
        textAnchor="middle"
        dy=".32em"
        fontSize="4.1em"
        className="font-medium"
        transform={`rotate(90 ${band.cx} ${collectionY})`}
      >
        <tspan>{objekt.collectionNo}</tspan>
        {!hideSerial && isObjektOwned(objekt) && (
          <tspan className="tracking-wide tabular-nums" dx={40}>
            #{objekt.serial}
          </tspan>
        )}
      </text>

      {/* artist logo */}
      {isIdntt && (
        <g transform={`rotate(90 ${logo.x} ${logo.y})`}>
          <g transform={`translate(${logo.x},${logo.y}) scale(${logo.scale})`}>
            <path
              d="M151.6 0v128.6L171 31l29.5.1-3.2 22.6c5.7-10 14-17.9 25-21.7 12.8-4.5 36.1-5.2 45.4 6.5l2.1 3.2V31.2h14.4l-.2-19.7 33.6-7.9v27.6l27.3-.4V11.5l33.2-7.9.1 27.6 19-.2v25.2h-19l.3 83.5h-33.6V56.8c0-.1.3-.2.1-.4l-.7-.3-26.2.1c-.2 0-.5.2-.5.3v83.2h-33.4V56.5l-.3-.3h-10.7c-.2 3.1-.4 6.3-1 9.4l-14.6 74.1H224l14.1-71.5c.6-4.6 1.4-10-3.8-12.1-5.2-2.2-13.9-1.8-19.2-.1-13 4.1-18 18.5-21.2 30.4l-10.4 53.3H118v-16.6c-2.1 3.1-4.1 6.1-6.8 8.7-16.5 15.5-49 13.3-61.7-6.2-12.5-19.2-12.3-60.5.1-79.6 13.8-21.3 47.9-22.6 64.2-4.7L118 47V.4zm-41.1 58.4c-7.4-7.1-23.5-7.3-30.1 1-7.5 9.3-7.3 35.5-3 46.4 3.7 9.6 12.1 12.5 21.7 11.3 10.5-1.4 15.4-7.2 17.6-17.2 2.4-11 2.4-33.2-6.2-41.5M.7 31h33.6l.2 108.7H.7zM0 1h35v23.3H0z"
              fill="currentColor"
            />
          </g>
        </g>
      )}
    </svg>
  );
}
