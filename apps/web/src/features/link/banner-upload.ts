import { MAX_FILE_SIZE } from "@repo/api/constants";
import { CACHE_CONTROL, acceptedFileMimeTypes } from "@repo/lib/media";
import { ofetch } from "ofetch";
import type { CropperRef } from "react-advanced-cropper";

import { m } from "@/paraglide/messages";

export const BANNER_ASPECT_RATIO = 2.4;

const ACCEPTED_TYPES = new Set<string>(acceptedFileMimeTypes);

export const BANNER_ACCEPT = acceptedFileMimeTypes.join(",");

/** the server's own bounds, checked here so nothing is uploaded to be refused */
export function bannerFileError(file: File): string | null {
  if (!ACCEPTED_TYPES.has(file.type)) return m.profile_edit_file_unsupported({ name: file.name });
  if (file.size > MAX_FILE_SIZE) return m.profile_edit_file_too_large({ name: file.name });
  return null;
}

/** videos keep their frame, and a GIF loses its animation through a canvas */
export function isCroppable(file: File): boolean {
  return file.type.startsWith("image/") && file.type !== "image/gif";
}

export async function cropToBanner(cropper: CropperRef | null, file: File): Promise<File> {
  const canvas = cropper?.getCanvas();
  if (!canvas) return file;

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, file.type);
  });

  return blob ? new File([blob], file.name, { type: file.type }) : file;
}

export async function putBanner(url: string, file: File): Promise<void> {
  const response = await ofetch.raw(url, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": file.type,
      "Content-Length": String(file.size),
      // signed into the presigned URL by createPresignedUploadUrl; omitting it
      // here fails the signature check
      "Cache-Control": CACHE_CONTROL,
    },
  });

  if (!response.ok) throw new Error(m.profile_edit_upload_error());
}
