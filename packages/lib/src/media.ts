/**
 * Every object we upload carries a unique timestamp in its key, so the bytes
 * behind a key never change and a 1-year immutable TTL is safe.
 *
 * Shared by the worker (collection images), the website (profile banners) and
 * the R2 backfill script so the three can never drift apart.
 */
export const CACHE_CONTROL = "public, max-age=31536000, immutable";

export const acceptedFileMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
  "video/x-matroska",
  "video/x-m4v",
] as const;

export type AcceptedFileMimeType = (typeof acceptedFileMimeTypes)[number];

export const mimeTypeToExtension: Record<AcceptedFileMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/bmp": "bmp",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/ogg": "ogv",
  "video/quicktime": "mov",
  "video/x-matroska": "mkv",
  "video/x-m4v": "m4v",
};

/**
 * Derived so it cannot drift from the forward map. `jpeg` and `jfif` are added
 * by hand: profile banner keys used to take their extension from the uploaded
 * filename, and Windows saves JPEGs as .jfif. Both are plain JPEG bytes. `svg`
 * and `avi` are no longer accepted for upload, but banners stored as them remain.
 */
export const extensionToMimeType: Record<string, string> = {
  ...Object.fromEntries(Object.entries(mimeTypeToExtension).map(([mime, ext]) => [ext, mime])),
  jpeg: "image/jpeg",
  jfif: "image/jpeg",
  svg: "image/svg+xml",
  avi: "video/x-msvideo",
};

/**
 * Zero-byte keys ending in a slash are folder markers created by S3 GUIs, not
 * real objects. Nothing we upload looks like this.
 */
export function isFolderMarker(key: string) {
  return key.endsWith("/");
}

/**
 * Resolve the Content-Type for a bucket key. Returns null for anything we do
 * not recognise, so callers can skip rather than guess: an S3 self-copy with
 * MetadataDirective=REPLACE would otherwise bake a wrong type in permanently.
 */
export function mimeTypeFromKey(key: string): string | null {
  const ext = key.split(".").pop()?.toLowerCase();
  if (!ext || ext === key.toLowerCase()) return null;
  return extensionToMimeType[ext] ?? null;
}
