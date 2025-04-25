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
        <span className="font-dot text-[3.4cqh] font-medium pr-[0.6cqh]">
          #{serial}
        </span>
      )}
    </div>
  );
}
