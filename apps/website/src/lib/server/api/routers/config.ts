import type { ValidArtist } from "@repo/cosmo/types/common";
import { validArtists } from "@repo/cosmo/types/common";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import * as z from "zod";

import { locales } from "@/i18n/config";

import { setUserLocale } from "../../locale";
import { fetchFilterData } from "../../objekt";
import { pub } from "../orpc";

export const configRouter = {
  getArtists: pub.handler(() => {
    const value = getCookie("artists");
    if (!value) return [];

    try {
      return JSON.parse(decodeURIComponent(value)) as ValidArtist[];
    } catch {
      return [];
    }
  }),

  getFilterData: pub.handler(fetchFilterData),

  setArtists: pub.input(z.enum(validArtists).array()).handler(({ input: artists }) => {
    setCookie("artists", JSON.stringify(artists), {
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
      httpOnly: true,
      secure: true,
      path: "/",
    });
  }),

  setLocale: pub.input(z.enum(locales)).handler(({ input: locale }) => {
    setUserLocale(locale);
  }),
};
