import { MAX_FILE_SIZE } from "@repo/api/constants";
import { movingGeometry, type Size } from "@repo/lib/banner";

/** Replaced whatever the size: SVG can carry script, BMP was stored mislabelled, and the videos do not play everywhere. */
const ALWAYS_REPLACE = new Set([
  "image/svg+xml",
  "image/bmp",
  "video/quicktime",
  "video/x-matroska",
  "video/ogg",
  "video/x-msvideo",
]);

/** A replace for size alone must save at least this share, or a banner already compressed is redone for nothing. */
const MIN_SAVING = 0.1;

export type BackfillDecision = "replace" | "keep" | "too-large";

export function isMovingType(type: string) {
  return type === "image/gif" || type.startsWith("video/");
}

export function backfillDecision({
  type,
  originalSize,
  newSize,
}: {
  type: string;
  originalSize: number;
  newSize: number;
}): BackfillDecision {
  if (newSize > MAX_FILE_SIZE) return "too-large";
  if (ALWAYS_REPLACE.has(type) || newSize <= originalSize * (1 - MIN_SAVING)) return "replace";
  return "keep";
}

/** ffprobe reports the coded size; a quarter turn of rotation swaps it to the upright one. */
export function displaySize({
  width,
  height,
  rotation,
}: Size & { rotation?: number | null }): Size {
  const quarterTurn = Math.abs(Math.round((rotation ?? 0) / 90)) % 2 === 1;
  return quarterTurn ? { width: height, height: width } : { width, height };
}

/**
 * The demuxer for a stored type, named so ffmpeg never guesses the format of
 * uploaded bytes (a guess can pick a playlist demuxer that reads other files).
 */
const DEMUXERS: Record<string, string> = {
  "image/gif": "gif",
  "video/mp4": "mov",
  "video/x-m4v": "mov",
  "video/quicktime": "mov",
  "video/webm": "matroska",
  "video/x-matroska": "matroska",
  "video/ogg": "ogg",
  "video/x-msvideo": "avi",
};

export function demuxerFor(type: string): string | null {
  return DEMUXERS[type] ?? null;
}

/** ffmpeg rotates before filters, so the crop is in upright pixels. */
export function ffmpegArgs(
  input: string,
  output: string,
  upright: Size,
  demuxer: string,
): string[] {
  const { crop, output: size } = movingGeometry(upright);
  return [
    "-y",
    "-v",
    "error",
    "-f",
    demuxer,
    "-i",
    input,
    "-map",
    "0:v:0",
    "-vf",
    `crop=${crop.width}:${crop.height}:${crop.left}:${crop.top},scale=${size.width}:${size.height}`,
    "-c:v",
    "libx264",
    "-crf",
    "23",
    "-preset",
    "slow",
    "-pix_fmt",
    "yuv420p",
    "-an",
    "-movflags",
    "+faststart",
    output,
  ];
}

/** The key `profile.getPresignedPost` gives an upload. */
export function bannerKey(address: string, now: number, ext: string) {
  return `profile-banner/${address.toLowerCase()}-${now}.${ext}`;
}

export type DoneEntry = {
  old: string;
  new?: string;
  orphan?: string;
  decision: string;
};

/**
 * URLs a run must not touch again: every banner it decided on, and every object
 * it wrote, since a profile pointing at one would otherwise be re-encoded. A
 * `pending` line whose final line never came keeps its old URL open, so a
 * crash before the `UPDATE` is retried.
 */
export function doneUrls(entries: DoneEntry[]): Set<string> {
  const urls = new Set<string>();
  for (const entry of entries) {
    if (entry.decision !== "pending") urls.add(entry.old);
    if (entry.new) urls.add(entry.new);
    if (entry.orphan) urls.add(entry.orphan);
  }
  return urls;
}
