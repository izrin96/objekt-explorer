import { fetchLiveSession } from "@repo/cosmo/server/live";
import { notFound } from "@tanstack/react-router";

import { fetchList } from "./server/api/routers/list";
import { fetchUserByIdentifier } from "./server/auth";
import { getAccessToken } from "./server/token";

export const getUserByIdentifier = async (identifier: string) => {
  const user = await fetchUserByIdentifier(identifier);
  if (!user) throw notFound();
  return user;
};

export const getLiveSession = async (id: string) => {
  const accessToken = await getAccessToken();
  const live = await fetchLiveSession(accessToken.accessToken, id).catch(() => undefined);
  if (!live) throw notFound();
  return live;
};

export const getList = async (slug: string, profileAddress?: string) => {
  const list = await fetchList(slug, profileAddress);
  if (!list) throw notFound();
  return list;
};
