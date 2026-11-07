import type { ValidObjekt } from "@repo/lib/types/objekt";

import { ObjektSidebar } from "./objekt-sidebar";
import { getCollectionShortNo } from "./objekt-utils";

type ObjektArtworkProps = {
  objekt: ValidObjekt;
  image?: "thumbnail" | "front";
  hideSerial?: boolean;
  /** load eagerly — the first rows are above the fold */
  priority?: boolean;
  fetchPriority?: "high";
};

/** The image and its band, filling a positioned photocard frame the caller draws. */
export function ObjektArtwork({
  objekt,
  image = "thumbnail",
  hideSerial = false,
  priority = false,
  fetchPriority,
}: ObjektArtworkProps) {
  return (
    <>
      <img
        src={image === "front" ? objekt.frontImage : objekt.thumbnailImage}
        alt={`${objekt.member} ${getCollectionShortNo(objekt)}`}
        loading={image === "front" || priority ? "eager" : "lazy"}
        fetchPriority={fetchPriority}
        decoding="async"
        draggable={false}
        className="absolute inset-0 size-full object-cover"
      />
      <ObjektSidebar objekt={objekt} hideSerial={hideSerial} />
    </>
  );
}
