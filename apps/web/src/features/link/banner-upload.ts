import { MAX_FILE_SIZE } from "@repo/api/constants";
import { STILL_MAX } from "@repo/lib/banner";
import {
  type AcceptedFileMimeType,
  CACHE_CONTROL,
  acceptedFileMimeTypes,
  mimeTypeToExtension,
} from "@repo/lib/media";
import type { CropperRef } from "react-advanced-cropper";

import { bannerPlan, uploadCheck } from "@/features/link/banner-rules";
import { m } from "@/paraglide/messages";

export const BANNER_ACCEPT = acceptedFileMimeTypes.join(",");

const toMB = (bytes: number) => Math.round(bytes / (1024 * 1024));

export function bannerFileError(file: File): string | null {
  const plan = bannerPlan(file);
  if (plan.kind !== "refuse") return null;
  return plan.reason === "type"
    ? m.profile_edit_file_unsupported({ name: file.name })
    : m.profile_edit_file_too_large({ name: file.name, limit: toMB(plan.limit) });
}

/** videos keep their frame, and a GIF loses its animation through a canvas */
export function isCroppable(file: File): boolean {
  return file.type.startsWith("image/") && file.type !== "image/gif";
}

const QUALITY = 0.85;

function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(uploadFailure())), type, QUALITY);
  });
}

function hasTransparency(canvas: HTMLCanvasElement): boolean {
  const context = canvas.getContext("2d");
  if (!context) return true;
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] !== 255) return true;
  }
  return false;
}

/**
 * Browsers that cannot encode WebP (Safari) hand back PNG: an opaque crop is
 * re-encoded as JPEG, a transparent one stays PNG, since a stored banner shows
 * on both themes and no backdrop colour suits both.
 */
async function cropToBanner(cropper: CropperRef | null, file: File): Promise<File> {
  const canvas = cropper?.getCanvas({ maxWidth: STILL_MAX.width, maxHeight: STILL_MAX.height });
  if (!canvas) throw uploadFailure();

  const webp = await toBlob(canvas, "image/webp");
  const blob =
    webp.type === "image/webp" || hasTransparency(canvas)
      ? webp
      : await toBlob(canvas, "image/jpeg");

  return renamed(blob, file.name);
}

/** The key's extension comes from the type, but the name should not contradict it. */
function renamed(blob: Blob, name: string): File {
  const ext = mimeTypeToExtension[blob.type as AcceptedFileMimeType] ?? "";
  const base = name.replace(/\.[^.]*$/, "");
  return new File([blob], ext ? `${base}.${ext}` : name, { type: blob.type });
}

const REFUSED = "BannerRefused";

const refusal = (text: string) => Object.assign(new Error(text), { name: REFUSED });

/** The message of a banner the dialog refused before uploading. */
export const refusalMessage = (error: Error) => (error.name === REFUSED ? error.message : null);

const tooLarge = (name: string) =>
  refusal(m.profile_edit_file_too_large({ name, limit: toMB(MAX_FILE_SIZE) }));

/**
 * The file to upload: a still cropped and re-encoded, a GIF or video converted
 * to MP4, or, where this browser cannot convert it, the original when it plays
 * as it is.
 */
export async function prepareBanner(
  picked: File,
  {
    cropper,
    signal,
    onProgress,
  }: { cropper: CropperRef | null; signal: AbortSignal; onProgress: (progress: number) => void },
): Promise<File> {
  if (isCroppable(picked)) {
    const file = await cropToBanner(cropper, picked);
    if (!uploadCheck(file)) throw tooLarge(picked.name);
    return file;
  }

  const { convertMovingBanner } = await import("@/features/link/banner-convert");
  const converted = await convertMovingBanner(picked, { signal, onProgress });
  if (converted) {
    if (!uploadCheck(converted)) throw refusal(m.profile_edit_banner_converted_too_large());
    return renamed(converted, picked.name);
  }

  const plan = bannerPlan(picked);
  if (plan.kind !== "moving" || !plan.rawFallback) {
    throw refusal(m.profile_edit_banner_cannot_convert({ name: picked.name }));
  }
  if (!uploadCheck(picked)) throw tooLarge(picked.name);
  return picked;
}

const UPLOAD_FAILED = "BannerUploadFailed";

const uploadFailure = () =>
  Object.assign(new Error("Banner upload failed"), { name: UPLOAD_FAILED });

export const isUploadFailure = (error: Error) => error.name === UPLOAD_FAILED;

export async function putBanner(url: string, file: File, signal: AbortSignal): Promise<void> {
  const response = await fetch(url, {
    method: "PUT",
    signal,
    body: file,
    headers: {
      "Content-Type": file.type,
      "Content-Length": String(file.size),
      // signed into the presigned URL by createPresignedUploadUrl; omitting it
      // here fails the signature check
      "Cache-Control": CACHE_CONTROL,
    },
  }).catch(() => null);

  if (!response?.ok) throw uploadFailure();
}
