import Image from "next/image";

import type { ValidObjekt } from "@/lib/universal/objekts";

import { isObjektOwned } from "@/lib/objekt-utils";
import { OBJEKT_SIZE } from "@/lib/utils";

type Props = {
  objekt: ValidObjekt;
  hideSerial?: boolean;
};

export default function ObjektSidebar(props: Props) {
  const { objekt } = props;
  return (
    <div className="pointer-events-none relative flex h-full w-full items-center text-(--objekt-text-color) select-none">
      {/* custom band image */}
      {objekt.bandImageUrl && (
        <Image className="object-cover" alt="band image" src={objekt.bandImageUrl} fill />
      )}
      <SidebarBand {...props} />
    </div>
  );
}

export function SidebarBand({ objekt, hideSerial = false }: Props) {
  const canvasHeight = OBJEKT_SIZE.height;
  const canvasWidth = OBJEKT_SIZE.width;
  const bandWidth = canvasWidth * 0.11;
  const bandHeight = canvasHeight * 0.885;
  const bandX = canvasWidth - bandWidth;
  const bandY = (canvasHeight - bandHeight) / 2;
  const radius = 46;

  const memberPos = {
    x: bandX + bandWidth / 2,
    y: 148,
  };

  const collectionPos = {
    x: bandX + bandWidth / 2,
    y: canvasHeight / 2,
  };

  const logoPos = {
    x: bandX + bandWidth / 2 + 26,
    y: bandHeight - 92,
    scale: 0.33,
  };

  return (
    <svg
      width={canvasWidth}
      height={canvasHeight}
      viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
      xmlns="http://www.w3.org/2000/svg"
      className="absolute h-full w-full"
    >
      {/* band background */}
      {objekt.artist === "idntt" && !objekt.bandImageUrl && (
        <path
          d={`
            M ${radius} 0
            H ${bandWidth}
            V ${bandHeight}
            H ${radius}
            Q 0 ${bandHeight} 0 ${bandHeight - radius}
            V ${radius}
            Q 0 0 ${radius} 0
            Z
          `}
          transform={`translate(${bandX}, ${bandY})`}
          fill={objekt.backgroundColor}
        />
      )}

      {/* member name */}
      {objekt.artist === "idntt" && (
        <text
          x={memberPos.x}
          y={memberPos.y}
          fill="currentColor"
          textAnchor="start"
          dy=".33em"
          fontSize="3.4em"
          className="font-semibold"
          transform={`rotate(90 ${memberPos.x} ${memberPos.y})`}
        >
          {objekt.member}
        </text>
      )}

      {/* collection no. and serial */}
      <text
        x={collectionPos.x}
        y={collectionPos.y}
        fill="currentColor"
        textAnchor="middle"
        dy=".32em"
        fontSize="4.1em"
        className="font-medium"
        transform={`rotate(90 ${collectionPos.x} ${collectionPos.y})`}
      >
        <tspan>{objekt.collectionNo}</tspan>
        {!hideSerial && isObjektOwned(objekt) && (
          <tspan className="tracking-wide tabular-nums" dx={40}>
            #{objekt.serial}
          </tspan>
        )}
      </text>

      {/* artist logo */}
      {objekt.artist === "idntt" && (
        <g
          transform={`rotate(90 ${logoPos.x} ${logoPos.y}) translate(${logoPos.x}, ${logoPos.y}) scale(${logoPos.scale})`}
        >
          <path
            d="M151.6 0v128.6L171 31l29.5.1-3.2 22.6c5.7-10 14-17.9 25-21.7 12.8-4.5 36.1-5.2 45.4 6.5l2.1 3.2V31.2h14.4l-.2-19.7 33.6-7.9v27.6l27.3-.4V11.5l33.2-7.9.1 27.6 19-.2v25.2h-19l.3 83.5h-33.6V56.8c0-.1.3-.2.1-.4l-.7-.3-26.2.1c-.2 0-.5.2-.5.3v83.2h-33.4V56.5l-.3-.3h-10.7c-.2 3.1-.4 6.3-1 9.4l-14.6 74.1H224l14.1-71.5c.6-4.6 1.4-10-3.8-12.1-5.2-2.2-13.9-1.8-19.2-.1-13 4.1-18 18.5-21.2 30.4l-10.4 53.3H118v-16.6c-2.1 3.1-4.1 6.1-6.8 8.7-16.5 15.5-49 13.3-61.7-6.2-12.5-19.2-12.3-60.5.1-79.6 13.8-21.3 47.9-22.6 64.2-4.7L118 47V.4zm-41.1 58.4c-7.4-7.1-23.5-7.3-30.1 1-7.5 9.3-7.3 35.5-3 46.4 3.7 9.6 12.1 12.5 21.7 11.3 10.5-1.4 15.4-7.2 17.6-17.2 2.4-11 2.4-33.2-6.2-41.5M.7 31h33.6l.2 108.7H.7zM0 1h35v23.3H0z"
            fill="currentColor"
          />
        </g>
      )}
    </svg>
  );
}
