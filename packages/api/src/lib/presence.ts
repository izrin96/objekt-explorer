import { userChannel } from "../schemas/realtime";
import type { ApiRequest } from "./realtime-requests";

/** A person counts as idle once no tab of theirs has seen activity for this long. */
export const IDLE_AFTER_SECONDS = 600;
/**
 * How long an activity mark lives. Long, because a missing mark reads as online: a tab from
 * before the reporter, or marks lost with Valkey, must not make an active person look idle.
 */
export const ACTIVE_MARK_SECONDS = 7 * 24 * 60 * 60;
/** When the person was last active in some tab, in epoch milliseconds. */
export const activeKey = (userId: string) => `presence:active:${userId}`;

/**
 * The online ids whose last activity, `marks[i]` for `online[i]`, is at least
 * `IDLE_AFTER_SECONDS` before `now`. A missing or unreadable mark is not idle, and `null` marks
 * (Valkey unreadable) is nobody idle, so idle fails toward online.
 */
export function idleFrom(online: string[], marks: readonly (string | null)[] | null, now: number) {
  if (marks === null) return [];
  return online.filter((_, index) => {
    const mark = marks[index];
    if (mark == null) return false;
    const at = Number(mark);
    return Number.isFinite(at) && now - at >= IDLE_AFTER_SECONDS * 1000;
  });
}

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
