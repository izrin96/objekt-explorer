import { authed } from "../orpc";
import { presenceOnlineInputSchema } from "../schemas/presence";
import { markActive, onlineAmong } from "../services/presence";
import { refuseOverUserLimit } from "../services/redis";

export const presenceRouter = {
  /**
   * Which of these people the viewer may see as online now, and which of those are idle; polled
   * by every visible tab.
   */
  online: authed
    .input(presenceOnlineInputSchema)
    .handler(async ({ input: { userIds }, context: { session } }) => {
      await refuseOverUserLimit("presence", session.user.id, 60, 60);
      return onlineAmong(session.user.id, userIds);
    }),

  /** The viewer was active in a tab in front; sent at most once a minute per tab. */
  active: authed.handler(async ({ context: { session } }) => {
    await refuseOverUserLimit("presence-active", session.user.id, 10, 60);
    await markActive(session.user.id);
  }),
};
