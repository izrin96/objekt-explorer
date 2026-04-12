import { validArtists } from "@repo/cosmo/types/common";
import { cookies } from "next/headers";
import * as z from "zod";

import type { Outputs } from "@/lib/orpc/server";
import { locales } from "@/lib/utils";

import { getArtists } from "../../artist";
import { parseSelectedArtists } from "../../cookie";
import { setUserLocale } from "../../locale";
import { fetchFilterData } from "../../objekt";
import { pub } from "../orpc";

export const configRouter = {
  getSelectedArtists: pub.handler(parseSelectedArtists),

  getFilterData: pub.handler(fetchFilterData),

  setArtists: pub.input(z.enum(validArtists).array()).handler(async ({ input: artists }) => {
    const cookie = await cookies();
    cookie.set("artists", JSON.stringify(artists), {
      maxAge: 12 * 60 * 60 * 24 * 30,
      sameSite: "lax",
      httpOnly: true,
      secure: true,
    });
  }),

  setLocale: pub.input(z.enum(locales)).handler(async ({ input: locale }) => {
    await setUserLocale(locale);
  }),

  getArtists: pub.handler(getArtists),
};

export type FilterDataOutput = Outputs["config"]["getFilterData"];
