import type { ActivityItem } from "../schemas/activity";
import {
  ACTIVITY_CHANNEL,
  type RealtimeEvent,
  SESSION_REVOKED_CODE,
  SESSION_REVOKED_REASON,
  userChannel,
} from "../schemas/realtime";
import { unique } from "./unique";

/** One call to Centrifugo's HTTP API: the path under its base URL and the JSON body. */
export type ApiRequest = { path: string; body: unknown };

type UserEvent = { userId: string; event: RealtimeEvent };

const publish = (channel: string, data: unknown) => ({ publish: { channel, data } });

export function publishRequest(userId: string, event: RealtimeEvent): ApiRequest {
  return { path: "/api/publish", body: { channel: userChannel(userId), data: event } };
}

/** One event to many users; each channel keeps its own history. */
export function broadcastRequest(userIds: string[], event: RealtimeEvent): ApiRequest {
  return {
    path: "/api/broadcast",
    body: { channels: unique(userIds).map(userChannel), data: event },
  };
}

/** Events that differ per user, sent in one call and applied in order. */
export function batchRequest(items: UserEvent[]): ApiRequest {
  return {
    path: "/api/batch",
    body: { commands: items.map(({ userId, event }) => publish(userChannel(userId), event)) },
  };
}

/** One publication per row, so the channel's history of 50 is the last 50 rows. */
export function activityRequest(items: ActivityItem[]): ApiRequest {
  return {
    path: "/api/batch",
    body: { commands: items.map((item) => publish(ACTIVITY_CHANNEL, item)) },
  };
}

export function disconnectRequest(userId: string): ApiRequest {
  return {
    path: "/api/disconnect",
    body: {
      user: userId,
      disconnect: { code: SESSION_REVOKED_CODE, reason: SESSION_REVOKED_REASON },
    },
  };
}

type ApiError = { code?: number; message?: string };

/**
 * The API answers 200 with an `error` for a refused call, in the body or, for a batch, in
 * any of its replies; returns the first one, or null when every command went through.
 */
export function firstApiError(response: unknown): ApiError | null {
  if (typeof response !== "object" || response === null) return null;
  const { error, replies } = response as { error?: ApiError; replies?: { error?: ApiError }[] };
  if (error) return error;
  return replies?.find((reply) => reply.error)?.error ?? null;
}
