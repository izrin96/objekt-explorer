import type { CSSProperties } from "react";
import { useElementSize } from "@/hooks/use-element-size";

type Props = {
  collection: string;
  serial?: number;
};

export default function ObjektSidebar({ collection, serial }: Props) {
  const [ref, { width }] = useElementSize();
  return (
    <div
      className="absolute right-0 flex h-full w-[11%] select-none items-center justify-center text-(--objekt-text-color) [writing-mode:vertical-lr]"
      ref={ref}
      style={
        {
          fontSize: `${0.55 * width}px`,
        } as CSSProperties
      }
    >
      <span className="font-semibold">{collection}</span>
      {serial !== undefined && (
        <div className="flex pt-[0.7em] font-semibold tracking-wide">
          <span className="pb-[.1em]">#</span>
          <span>{serial}</span>
        </div>
      )}
    </div>
  );
}
