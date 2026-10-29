import { authed } from "../orpc";
import { presenceOnlineInputSchema } from "../schemas/presence";
import { onlineAmong } from "../services/presence";
import { refuseOverUserLimit } from "../services/redis";

export const presenceRouter = {
  /** Which of these people the viewer may see as online now; polled by every visible tab. */
  online: authed
    .input(presenceOnlineInputSchema)
    .handler(async ({ input: { userIds }, context: { session } }) => {
      await refuseOverUserLimit("presence", session.user.id, 60, 60);
      return { online: await onlineAmong(session.user.id, userIds) };
    }),
};
