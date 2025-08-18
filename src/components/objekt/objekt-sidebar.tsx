import type { CSSProperties } from "react";
import { useElementSize } from "@/hooks/use-element-size";
import type { ValidObjekt } from "@/lib/universal/objekts";
import { cn } from "@/utils/classes";
import IdnttLogo from "../idntt-logo";

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
        <div
          className={cn(
            "flex h-[88%] w-full items-center justify-between rounded-l-(--band-radius) bg-(--objekt-bg-color) px-(--band-spacing) font-bold [writing-mode:vertical-lr]",
            objekt.class === "Special" &&
              "bg-[radial-gradient(circle_at_top_left,_#F9E7E3,_#CDD3ED,_#F3E0D1,_#F0E0E3,_#F3D7E5,_#EBD4E8,_#EBB7DD,_#D0B4EA)]",
          )}
        >
          <span>{objekt.member}</span>
          <IdnttLogo className="h-[10%] w-[120%] rotate-90" />
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
