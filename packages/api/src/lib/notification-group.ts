import {
  type AlertMatch,
  type AlertPayload,
  LATEST_LIMIT,
  type NotificationType,
} from "../schemas/notification";

/** One unread notification per type, list and UTC day. */
export function groupKey(type: NotificationType, listId: number, at: Date) {
  return `${type}:${listId}:${at.toISOString().slice(0, 10)}`;
}

/** `matches` are newest first; they push older ones out of `latest`. */
export function mergePayload(
  existing: AlertPayload | null,
  list: AlertPayload["list"],
  matches: AlertMatch[],
): AlertPayload {
  return {
    list,
    count: (existing?.count ?? 0) + matches.length,
    latest: [...matches, ...(existing?.latest ?? [])].slice(0, LATEST_LIMIT),
  };
}
