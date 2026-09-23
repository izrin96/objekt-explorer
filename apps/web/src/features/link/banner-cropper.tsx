import type { RefObject } from "react";
import { Cropper, type CropperRef } from "react-advanced-cropper";

import "react-advanced-cropper/dist/style.css";

import { BANNER_ASPECT_RATIO } from "@/features/link/banner-upload";

/** Its own module so the cropper loads when a banner is picked, not with every profile page. */
export function BannerCropper({
  url,
  cropperRef,
}: {
  url: string;
  cropperRef: RefObject<CropperRef | null>;
}) {
  return (
    <div className="h-52 w-full">
      <Cropper ref={cropperRef} src={url} aspectRatio={() => BANNER_ASPECT_RATIO} />
    </div>
  );
}
