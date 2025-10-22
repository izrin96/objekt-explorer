import { notFound } from "@tanstack/react-router";
import z from "zod";
import { validArtists } from "@/lib/universal/cosmo/common";
import { getSession, toPublicUser } from "../../auth";
import { parseSelectedArtists, setSelectedArtists } from "../../cookie";
import { artists } from "../../cosmo/artists";
import { fetchLiveSession } from "../../cosmo/live";
import { getFilterData } from "../../objekts/filter-data";
import { getAccessToken } from "../../token";
import { pub } from "../orpc";
import { cosmoLinkRouter } from "./cosmo-link";
import { listRouter } from "./list";
import { lockedObjektsRouter } from "./locked-objekts";
import { pinsRouter } from "./pins";
import { profileRouter } from "./profile";
import { userRouter } from "./user";

export const router = {
  list: listRouter,
  cosmoLink: cosmoLinkRouter,
  user: userRouter,
  pins: pinsRouter,
  profile: profileRouter,
  lockedObjekt: lockedObjektsRouter,

  // get session
  session: pub.handler(getSession),

  // get current user
  currentUser: pub.handler(async () => {
    const session = await getSession();
    return toPublicUser(session);
  }),

  // get artists
  artists: pub.handler(() => artists),

  // selected artists
  selectedArtist: {
    get: pub.handler(() => parseSelectedArtists()),
    set: pub
      .input(z.object({ artists: z.enum(validArtists).array() }))
      .handler(({ input }) => setSelectedArtists(input.artists)),
  },

  // filter data
  filterData: pub.handler(() => getFilterData()),

  // live
  liveSession: {
    find: pub.input(z.object({ id: z.string() })).handler(async ({ input: { id } }) => {
      const accessToken = await getAccessToken();
      const live = await fetchLiveSession(accessToken.accessToken, id);
      if (!live) throw notFound();
      return live;
    }),
  },
};
