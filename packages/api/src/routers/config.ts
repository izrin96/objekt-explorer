import { setCookie } from "@tanstack/react-start/server";

import { pub } from "../orpc";
import { artistsArraySchema } from "../schemas/common/artist";
import { documented } from "../schemas/common/documented";
import { artistsOutputSchema, filterDataOutputSchema } from "../schemas/config";
import { getArtists } from "../services/artist";
import { parseSelectedArtists } from "../services/cookie";
import { fetchFilterData } from "../services/objekt";
import type { Outputs } from "./index";

export const configRouter = {
  getSelectedArtists: pub.handler(parseSelectedArtists),

  getFilterData: pub
    .route({
      method: "GET",
      path: "/filters",
      tags: ["Artists"],
      summary: "The seasons, classes and collection numbers the filters offer",
    })
    .output(documented(filterDataOutputSchema))
    .handler(fetchFilterData),

  setArtists: pub.input(artistsArraySchema).handler(async ({ input: artists }) => {
    setCookie("artists", JSON.stringify(artists), {
      maxAge: 12 * 60 * 60 * 24 * 30,
      sameSite: "lax",
      httpOnly: true,
      secure: true,
    });
  }),

  getArtists: pub
    .route({
      method: "GET",
      path: "/artists",
      tags: ["Artists"],
      summary: "Every artist and its members, as Cosmo lists them",
    })
    .output(documented(artistsOutputSchema, { open: true }))
    .handler(getArtists),
};

export type FilterDataOutput = Outputs["config"]["getFilterData"];
