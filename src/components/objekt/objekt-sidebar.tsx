import type { CSSProperties } from "react";
import OmaBandBg from "@/assets/oma-band-bg.png";
import SpecialBandBg from "@/assets/special-band-bg.png";
import UnitBandBg from "@/assets/unit-band-bg.png";
import { useElementSize } from "@/hooks/use-element-size";
import type { ValidObjekt } from "@/lib/universal/objekts";
import IdnttLogo from "../idntt-logo";

type Props = {
  objekt: ValidObjekt;
  hideSerial?: boolean;
};

export default function ObjektSidebar({ objekt, hideSerial = false }: Props) {
  const [ref, { width }] = useElementSize();
  return (
    <div
      className="absolute flex h-full w-full select-none items-center text-(--objekt-text-color) text-[calc(var(--width)*0.05)]"
      ref={ref}
      style={
        {
          "--width": `${width}px`,
        } as CSSProperties
      }
    >
      {/* band background, only for idntt */}
      {objekt.artist === "idntt" && (
        <div className="absolute right-0 h-[88.2%] w-[10.8%] rounded-l-[calc(var(--width)*0.035)] bg-(--objekt-bg-color)"></div>
      )}

      {/* custom band image, mostly for idntt */}
      {/* special class */}
      {objekt.artist === "idntt" && objekt.class === "Special" && (
        <img
          src={SpecialBandBg.src}
          alt=""
          className="absolute right-0 h-[88.2%] w-[10.8%] rounded-l-[calc(var(--width)*0.035)]"
        />
      )}

      {/* unit class */}
      {objekt.artist === "idntt" && objekt.class === "Unit" && (
        <img
          src={UnitBandBg.src}
          alt=""
          className="absolute right-0 h-[88.2%] w-[10.8%] rounded-l-[calc(var(--width)*0.035)]"
        />
      )}

      {/* oma */}
      {objekt.artist === "idntt" &&
        objekt.onOffline === "offline" &&
        objekt.backgroundColor === "#000000" && (
          <img
            src={OmaBandBg.src}
            alt=""
            className="absolute right-0 h-[90.5%] w-[12.8%] rounded-l-[calc(var(--width)*0.05)]"
          />
        )}

      <div className="absolute right-0 flex h-[88.2%] w-[10.8%] items-center">
        {/* band artist and member name, only for idntt */}
        {objekt.artist === "idntt" && (
          <div className="absolute flex h-full w-full items-center justify-between px-[calc(var(--width)*0.048)] font-bold [writing-mode:vertical-lr]">
            <span>{objekt.member}</span>
            <IdnttLogo className="h-[10%] w-[120%] rotate-90" />
          </div>
        )}

        {/* band collection no. and serial */}
        <div className="absolute flex w-full items-center font-semibold text-[calc(var(--width)*0.06)] [writing-mode:vertical-lr]">
          <span>{objekt.collectionNo}</span>
          {!hideSerial && "serial" in objekt && (
            <div className="flex pt-[0.7em] tracking-wide">
              <span className="pb-[.1em]">#</span>
              <span>{objekt.serial}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
