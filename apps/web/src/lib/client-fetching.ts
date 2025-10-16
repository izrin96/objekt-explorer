import { notFound } from "next/navigation";
import { cache } from "react";
import { fetchList } from "./server/api/routers/list";
import { fetchUserByIdentifier } from "./server/auth";
import { parseSelectedArtists } from "./server/cookie";
import { fetchLiveSession } from "./server/cosmo/live";
import { getAccessToken } from "./server/token";

export const getUserByIdentifier = cache(async (identifier: string) => {
  const user = await fetchUserByIdentifier(identifier);
  if (!user) notFound();
  return user;
});

export const getLiveSession = cache(async (id: string) => {
  const accessToken = await getAccessToken();
  const live = await fetchLiveSession(accessToken.accessToken, id);
  if (!live) notFound();
  return live;
});

export const getSelectedArtists = cache(parseSelectedArtists);

export const getList = cache(async (slug: string) => {
  const list = await fetchList(slug);
  if (!list) notFound();
  return list;
});
