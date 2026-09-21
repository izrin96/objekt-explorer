import { setCookie } from "@tanstack/react-start/server";

import { pub } from "../orpc";
import { artistsArraySchema } from "../schemas/artist";
import { getArtists } from "../services/artist";
import { parseSelectedArtists } from "../services/cookie";
import { fetchFilterData } from "../services/objekt";
import type { Outputs } from "./index";

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
