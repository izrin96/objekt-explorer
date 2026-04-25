import { ORPCError } from "@orpc/server";
import { fetchLiveSession } from "@repo/cosmo/server/live";
import * as z from "zod";

import { getAccessToken } from "../../token.server";
import { pub } from "../orpc";

export const liveRouter = {
  get: pub
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .handler(async ({ input: { id } }) => {
      const { accessToken } = await getAccessToken();
      const live = await fetchLiveSession(accessToken, id).catch(() => undefined);
      if (!live) throw new ORPCError("NOT_FOUND");
      return live;
    }),
};
