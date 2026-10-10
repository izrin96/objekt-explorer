import {
  activityRequest,
  type ApiRequest,
  batchRequest,
  broadcastRequest,
  disconnectRequest,
  firstApiError,
  publishRequest,
} from "./lib/realtime-requests";
import type { ActivityItem } from "./schemas/activity";
import type { RealtimeEvent } from "./schemas/realtime";

const TIMEOUT_MS = 1500;

let warned = false;

// read from the environment at call time: the worker imports this and has no `serverEnv`
function target() {
  const url = process.env.CENTRIFUGO_URL;
  const key = process.env.CENTRIFUGO_API_KEY;
  if (url && key) return { url: url.replace(/\/+$/, ""), key };
  if (!warned) {
    warned = true;
    console.warn(
      "[Realtime] CENTRIFUGO_URL or CENTRIFUGO_API_KEY is not set; nothing is published",
    );
  }
  return null;
}

/**
 * Failures are logged and dropped: a lost event is recovered by the tab's next refetch, and a
 * publish must never fail a write that already committed.
 */
async function call({ path, body }: ApiRequest) {
  const api = target();
  if (!api) return;
  try {
    const response = await fetch(`${api.url}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": api.key },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      console.error(`[Realtime] ${path} answered ${response.status}`);
      return;
    }
    const error = firstApiError(await response.json());
    if (error) console.error(`[Realtime] ${path} refused: ${error.code} ${error.message}`);
  } catch (error) {
    console.error(
      `[Realtime] Failed to call ${path}:`,
      error instanceof Error ? error.message : String(error),
    );
  }
}

export function publishUser(userId: string, event: RealtimeEvent) {
  return call(publishRequest(userId, event));
}

/** The same event to several users in one call. */
export function publishUsers(userIds: string[], event: RealtimeEvent) {
  if (userIds.length === 0) return Promise.resolve();
  return call(broadcastRequest(userIds, event));
}

/** Events that differ per user, in one call. */
export function publishBatch(items: { userId: string; event: RealtimeEvent }[]) {
  if (items.length === 0) return Promise.resolve();
  return call(batchRequest(items));
}

export function publishActivity(items: ActivityItem[]) {
  if (items.length === 0) return Promise.resolve();
  return call(activityRequest(items));
}

/** Closes every connection of the user with a code their tabs do not reconnect after. */
export function disconnectUser(userId: string) {
  return call(disconnectRequest(userId));
}
