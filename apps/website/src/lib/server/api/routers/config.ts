import { setCookie } from "@tanstack/react-start/server";

import type { Outputs } from "@/lib/orpc/server";
import { artistsArraySchema } from "@/lib/universal/artist";

import { getArtists } from "../../artist.server";
import { parseSelectedArtists } from "../../cookie.server";
import { fetchFilterData } from "../../objekt.server";
import { pub } from "../orpc";

export const configRouter = {
  getSelectedArtists: pub.handler(parseSelectedArtists),

  getFilterData: pub.handler(fetchFilterData),

  setArtists: pub.input(artistsArraySchema).handler(async ({ input: artists }) => {
    setCookie("artists", JSON.stringify(artists), {
      maxAge: 12 * 60 * 60 * 24 * 30,
      sameSite: "lax",
      httpOnly: true,
      secure: true,
    });
  }),

  getArtists: pub.handler(getArtists),
};

export type FilterDataOutput = Outputs["config"]["getFilterData"];
