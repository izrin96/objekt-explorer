import { userChannel } from "../schemas/realtime";
import type { ApiRequest } from "./realtime-requests";

/**
 * One `presence_stats` per user channel in one call; the replies come back in the same order.
 * `parallel`, since staging and production keep presence in Valkey, where a hundred lookups one
 * after another can outlast the call's timeout.
 */
export function presenceStatsRequest(userIds: string[]): ApiRequest {
  return {
    path: "/api/batch",
    body: {
      commands: userIds.map((userId) => ({ presence_stats: { channel: userChannel(userId) } })),
      parallel: true,
    },
  };
}

/**
 * The ids whose channel has a connection. Fails closed: an error reply, a missing one, or a body
 * that is not a batch reply reads as offline (the `user` namespace without presence answers
 * `{ error: { code: 108 } }`).
 */
export function onlineFromReplies(userIds: string[], response: unknown): string[] {
  if (typeof response !== "object" || response === null) return [];
  const { replies } = response as { replies?: unknown };
  if (!Array.isArray(replies)) return [];
  return userIds.filter((_, index) => {
    const reply = replies[index] as { presence_stats?: { num_clients?: unknown } } | undefined;
    const clients = reply?.presence_stats?.num_clients;
    return typeof clients === "number" && clients > 0;
  });
}

/**
 * Whether a person's online dot reaches the viewer: their switch on, no block, not self. The
 * viewer's own switch only hides them, never what they see.
 */
export function showsOnlineTo(facts: { shownShows: boolean; blocked: boolean; self: boolean }) {
  return facts.shownShows && !facts.blocked && !facts.self;
}

/**
 * Of the asked ids, those to look up: `rows` holds each asked person's switch and whether a block
 * stands between them and the viewer; an id with no row is nobody.
 */
export function presenceTargets(
  viewerId: string,
  askedIds: string[],
  rows: { id: string; shows: boolean; blocked: boolean }[],
) {
  const byId = new Map(rows.map((row) => [row.id, row]));
  return askedIds.filter((id) => {
    const row = byId.get(id);
    return (
      row !== undefined &&
      showsOnlineTo({
        shownShows: row.shows,
        blocked: row.blocked,
        self: id === viewerId,
      })
    );
  });
}
