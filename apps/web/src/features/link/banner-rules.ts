import { MAX_FILE_SIZE } from "@repo/api/constants";
import { acceptedFileMimeTypes } from "@repo/lib/media";

/** Re-encoded before upload, so only the uploaded file has to meet `MAX_FILE_SIZE`. */
export const MAX_STILL_PICK_SIZE = 25 * 1024 * 1024;
export const MAX_MOVING_PICK_SIZE = 100 * 1024 * 1024;

const ACCEPTED_TYPES = new Set<string>(acceptedFileMimeTypes);

/** Play as they are in current browsers, so they may upload unconverted. */
const RAW_PLAYABLE = new Set(["image/gif", "video/mp4", "video/x-m4v", "video/webm"]);

type Picked = Pick<File, "type" | "size">;

export type BannerPlan =
  | { kind: "still" }
  | { kind: "moving"; rawFallback: boolean }
  | { kind: "refuse"; reason: "type" }
  | { kind: "refuse"; reason: "size"; limit: number };

function isMoving(type: string) {
  return type === "image/gif" || type.startsWith("video/");
}

export function bannerPlan(file: Picked): BannerPlan {
  if (!ACCEPTED_TYPES.has(file.type)) return { kind: "refuse", reason: "type" };
  if (isMoving(file.type)) {
    if (file.size > MAX_MOVING_PICK_SIZE) {
      return { kind: "refuse", reason: "size", limit: MAX_MOVING_PICK_SIZE };
    }
    return { kind: "moving", rawFallback: RAW_PLAYABLE.has(file.type) };
  }
  if (file.size > MAX_STILL_PICK_SIZE) {
    return { kind: "refuse", reason: "size", limit: MAX_STILL_PICK_SIZE };
  }
  return { kind: "still" };
}

/** The server's own bound, on the file about to be uploaded. */
export function uploadCheck(file: Picked): boolean {
  return file.size <= MAX_FILE_SIZE;
}
