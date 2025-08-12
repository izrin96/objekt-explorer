import type { CSSProperties } from "react";
import { useElementSize } from "@/hooks/use-element-size";
import type { ValidObjekt } from "@/lib/universal/objekts";

type Props = {
  objekt: ValidObjekt;
  hideSerial?: boolean;
};

export default function ObjektSidebar({ objekt, hideSerial = false }: Props) {
  const [ref, { width }] = useElementSize();
  return (
    <div
      className="absolute right-0 flex h-full w-[10.8%] select-none items-center text-(--objekt-text-color)"
      ref={ref}
      style={
        {
          "--collection-font-size": `${0.55 * width}px`,
          "--band-radius": `${0.3 * width}px`,
          "--band-spacing": `${0.4 * width}px`,
          fontSize: `${0.45 * width}px`,
        } as CSSProperties
      }
    >
      {objekt.artist === "idntt" && (
        <div className="flex h-[88%] w-full items-center justify-between rounded-l-(--band-radius) bg-(--objekt-bg-color) px-(--band-spacing) font-bold [writing-mode:vertical-lr]">
          <span>{objekt.member}</span>
          <span>{objekt.artist}</span>
        </div>
      )}

      <div className="text-(size:--collection-font-size) absolute flex w-full items-center justify-center font-semibold [writing-mode:vertical-lr]">
        <span>{objekt.collectionNo}</span>
        {!hideSerial && "serial" in objekt && (
          <div className="flex pt-[0.7em] tracking-wide">
            <span className="pb-[.1em]">#</span>
            <span>{objekt.serial}</span>
          </div>
        )}
      </div>
    </div>
  );
}
