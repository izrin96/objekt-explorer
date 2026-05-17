import { validArtists } from "@repo/cosmo/types/common";
import { setCookie } from "@tanstack/react-start/server";
import * as z from "zod";

import type { Outputs } from "@/lib/orpc/server";

import { getArtists } from "../../artist.server";
import { parseSelectedArtists } from "../../cookie.server";
import { fetchFilterData } from "../../objekt.server";
import { pub } from "../orpc";

export const configRouter = {
  getSelectedArtists: pub.handler(parseSelectedArtists),

  getFilterData: pub.handler(fetchFilterData),

  setArtists: pub.input(z.enum(validArtists).array()).handler(async ({ input: artists }) => {
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
