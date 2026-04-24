import { getCookie, setCookie } from "@tanstack/react-start/server";

import type { Locale } from "../utils";

const defaultLocale = "en";
const COOKIE_NAME = "NEXT_LOCALE";

export async function getUserLocale(): Promise<Locale> {
  const cookie = getCookie(COOKIE_NAME);
  return cookie === "en" || cookie === "ko" ? cookie : defaultLocale;
}

export async function setUserLocale(locale: Locale) {
  setCookie(COOKIE_NAME, locale, {
    maxAge: 12 * 60 * 60 * 24 * 30,
  });
}
