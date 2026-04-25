import { fetchLiveSession } from "@repo/cosmo/server/live";
import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";

import { getAccessToken } from "../token.server";

export const getLiveSessionById = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const { accessToken } = await getAccessToken();
    const live = await fetchLiveSession(accessToken, data.id).catch(() => undefined);
    if (!live) throw notFound();
    return live;
  });
