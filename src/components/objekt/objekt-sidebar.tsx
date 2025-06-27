import React from "react";

type Props = {
  collection: string;
  serial?: number;
};

export default function ObjektSidebar({ collection, serial }: Props) {
  return (
    <div className="absolute @container h-full items-center w-[11%] flex gap-1.5 justify-center right-0 [writing-mode:vertical-lr] text-(--objekt-text-color) select-none">
      <span className="text-[3.4cqh] font-bold">{collection}</span>
      {serial !== undefined && (
        <div className="text-[3.4cqh] font-light tabular-nums gap-0.5 flex">
          <span>#</span>
          <span>{serial}</span>
        </div>
      )}
    </div>
  );
}
