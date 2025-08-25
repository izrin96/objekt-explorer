import type { CSSProperties } from "react";
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
      className="pointer-events-none absolute flex h-full w-full select-none items-center text-(--objekt-text-color) text-[calc(var(--width)*0.05)]"
      ref={ref}
      style={
        {
          "--width": `${width}px`,
        } as CSSProperties
      }
    >
      {/* custom band image */}
      {objekt.bandImageUrl && (
        <img
          className="absolute top-0 left-0 h-full w-full object-cover"
          alt=""
          src={objekt.bandImageUrl}
        />
      )}

      {/* band background, only for idntt */}
      {!objekt.bandImageUrl && objekt.artist === "idntt" && (
        <div className="absolute right-0 h-[88.2%] w-[10.8%] rounded-l-[calc(var(--width)*0.035)] bg-(--objekt-bg-color)"></div>
      )}

      {/* temporary custom band image, mostly for idntt */}
      {!objekt.bandImageUrl && <TempCustomBand objekt={objekt} />}

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

function TempCustomBand({ objekt }: { objekt: ValidObjekt }) {
  return (
    <>
      {/* special class */}
      {objekt.artist === "idntt" && objekt.class === "Special" && (
        <img
          src="https://resources.cosmo.fans/images/collection-band/2025/08/14/06/raw/86207a80d354439cada0ec6c45e076ee20250814061643330.png"
          alt=""
          className="absolute top-0 left-0 h-full w-full object-cover"
        />
      )}

      {/* unit class */}
      {objekt.artist === "idntt" && objekt.class === "Unit" && (
        <img
          src="https://resources.cosmo.fans/images/collection-band/2025/08/14/06/raw/e0e4fdd950bc4ca8ba49a98b053756f620250814065358420.png"
          alt=""
          className="absolute top-0 left-0 h-full w-full object-cover"
        />
      )}

      {/* oma */}
      {objekt.artist === "idntt" &&
        objekt.onOffline === "offline" &&
        objekt.backgroundColor === "#000000" && (
          <img
            src="https://resources.cosmo.fans/images/collection-band/2025/07/12/04/raw/fab4f9ec98d24a00a7c417e012a493cd20250712042141653.png"
            alt=""
            className="absolute top-0 left-0 h-full w-full object-cover"
          />
        )}
    </>
  );
}
