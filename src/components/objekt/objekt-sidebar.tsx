import React from "react";

type Props = {
  collection: string;
  serial?: number;
};

export default function ObjektSidebar({ collection, serial }: Props) {
  return (
    <div className="absolute @container h-full items-center w-[11%] flex gap-1.5 justify-center right-0 [writing-mode:vertical-lr] text-(--objekt-text-color) select-none">
      <span className="text-[3.4cqh] font-semibold">{collection}</span>
      {serial && <span className="font-doto font-semibold text-[3.4cqh]">#{serial}</span>}
    </div>
  );
}
