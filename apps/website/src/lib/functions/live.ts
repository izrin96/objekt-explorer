import { serverEnv } from "@repo/api/env";
import { getAccessToken } from "@repo/api/services/token";
import { fetchLiveSession } from "@repo/cosmo/server/live";
import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";

export const getLiveSessionById = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const { accessToken } = await getAccessToken();
    const live = await fetchLiveSession(accessToken, data.id).catch(() => undefined);
    if (!live) throw notFound();
    return live;
  });

export const checkAccess = createServerFn({ method: "GET" })
  .validator(z.object({ token: z.string().optional() }))
  .handler(async ({ data: { token } }) => {
    if (!token) return false;
    const bypassToken = serverEnv.BYPASS_LIVE_KEY;
    const isBypass = bypassToken === token;
    return isBypass;
  });
