import { useElementSize } from "@/hooks/use-element-size";
import React from "react";

type Props = {
  collection: string;
  serial?: number;
};

export default function ObjektSidebar({ collection, serial }: Props) {
  const [ref, { height }] = useElementSize();
  return (
    <div
      ref={ref}
      style={
        {
          "--height": height,
        } as React.CSSProperties
      }
      className="absolute h-full text-[calc(var(--height)*.034px)] items-center w-[11%] flex gap-2 justify-center right-0 [writing-mode:vertical-lr] font-semibold text-(--objekt-text-color) select-none"
    >
      <span>{collection}</span>
      {/* {serial !== undefined && (
        <span className="font-dotmatrix font-normal pr-[3px]">
          #{serial.toString().padStart(5, "0")}
        </span>
      )} */}
    </div>
  );
}
