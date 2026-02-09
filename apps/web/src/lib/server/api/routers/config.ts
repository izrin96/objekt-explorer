import type { ValidArtist } from "@repo/cosmo/types/common";

import { validArtists } from "@repo/cosmo/types/common";
import { cookies } from "next/headers";
import * as z from "zod";

import { locales } from "@/i18n/config";

import { setUserLocale } from "../../locale";
import { fetchFilterData } from "../../objekt";
import { pub } from "../orpc";

export const configRouter = {
  getArtists: pub.handler(async () => {
    const cookie = await cookies();
    const value = cookie.get("artists")?.value;

    if (value === undefined) return [];

    try {
      return JSON.parse(value) as ValidArtist[];
    } catch {
      return [];
    }
  }),

  getFilterData: pub.handler(fetchFilterData),

  setArtists: pub.input(z.enum(validArtists).array()).handler(async ({ input: artists }) => {
    const cookie = await cookies();
    cookie.set("artists", JSON.stringify(artists), {
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
      httpOnly: true,
      secure: true,
    });
  }),

  setLocale: pub.input(z.enum(locales)).handler(async ({ input: locale }) => {
    await setUserLocale(locale);
  }),
};
