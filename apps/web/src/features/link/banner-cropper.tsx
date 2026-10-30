import { BANNER_ASPECT_RATIO } from "@repo/lib/banner";
import type { RefObject } from "react";

import "react-advanced-cropper/dist/style.css";

import { Cropper, type CropperRef } from "react-advanced-cropper";

/** Its own module so the cropper loads when a banner is picked, not with every profile page. */
export function BannerCropper({
  url,
  cropperRef,
  onReady,
  onError,
}: {
  url: string;
  cropperRef: RefObject<CropperRef | null>;
  /** the image has loaded, so `getCanvas` can draw the crop */
  onReady: () => void;
  /** the image could not be loaded, so there is nothing to crop */
  onError: () => void;
}) {
  return (
    <div className="h-52 w-full">
      <Cropper
        ref={cropperRef}
        src={url}
        aspectRatio={() => BANNER_ASPECT_RATIO}
        onReady={onReady}
        onError={onError}
      />
    </div>
  );
}
