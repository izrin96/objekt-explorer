import React from "react";

type Props = {
  collection: string;
  serial?: number;
};

export default function ObjektSidebar({ collection }: Props) {
  return (
    <div className="absolute @container h-full items-center w-[11%] flex gap-2 justify-center right-0 [writing-mode:vertical-lr] font-semibold text-(--objekt-text-color) select-none">
      <span className="text-[3.4cqh]">{collection}</span>
    </div>
  );
}
