import { serverEnv } from "@repo/api/env";
import { getAccessToken } from "@repo/api/services/token";
import { fetchLiveSession } from "@repo/cosmo/server/live";
import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";

function hasAccess(token: string | undefined) {
  if (!token) return false;
  return serverEnv.BYPASS_LIVE_KEY === token;
}

// a server function is callable on its own, so the route's gate is checked again here
export const getLiveSessionById = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().regex(/^\d+$/), token: z.string().optional() }))
  .handler(async ({ data }) => {
    if (!hasAccess(data.token)) throw notFound();
    const { accessToken } = await getAccessToken();
    const live = await fetchLiveSession(accessToken, data.id).catch(() => undefined);
    if (!live) throw notFound();
    return live;
  });

export const checkAccess = createServerFn({ method: "GET" })
  .validator(z.object({ token: z.string().optional() }))
  .handler(({ data: { token } }) => hasAccess(token));
