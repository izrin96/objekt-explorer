import { fetchLiveSession } from "@repo/cosmo/server/live";
import { notFound } from "next/navigation";
import { cache } from "react";

import { fetchList } from "./server/api/routers/list";
import { fetchUserByIdentifier } from "./server/auth";
import { getAccessToken } from "./server/token";

export const getUserByIdentifier = cache(async (identifier: string, userId?: string) => {
  const user = await fetchUserByIdentifier(identifier, userId);
  if (!user) notFound();
  return user;
});

export const getLiveSession = cache(async (id: string) => {
  const accessToken = await getAccessToken();
  const live = await fetchLiveSession(accessToken.accessToken, id).catch(() => undefined);
  if (!live) notFound();
  return live;
});

export const getList = cache(async (slug: string, userId?: string) => {
  const list = await fetchList(slug, userId);
  if (!list) notFound();
  return list;
});
