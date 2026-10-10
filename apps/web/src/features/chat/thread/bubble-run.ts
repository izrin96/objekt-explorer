import type { ChatMessage } from "@repo/api/schemas/chat";

/** Within this, consecutive messages from one side share one time stamp. */
export const GROUP_MS = 5 * 60_000;

export type RunPosition = "single" | "first" | "middle" | "last";

type Stamp = Pick<ChatMessage, "mine" | "createdAt">;

function joins(earlier: Stamp | undefined, later: Stamp | undefined) {
  if (!earlier || !later || earlier.mine !== later.mine) return false;
  return new Date(later.createdAt).getTime() - new Date(earlier.createdAt).getTime() <= GROUP_MS;
}

export function runPosition(
  previous: Stamp | undefined,
  message: Stamp,
  next: Stamp | undefined,
): RunPosition {
  const after = joins(previous, message);
  const before = joins(message, next);
  if (after) return before ? "middle" : "last";
  return before ? "first" : "single";
}
