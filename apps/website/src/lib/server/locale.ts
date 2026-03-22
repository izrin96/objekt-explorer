import { getCookie, setCookie } from "@tanstack/react-start/server";

import { defaultLocale, type Locale } from "@/i18n/config";

const COOKIE_NAME = "NEXT_LOCALE";

export function getUserLocale() {
  return (getCookie(COOKIE_NAME) as Locale) || defaultLocale;
}

export function setUserLocale(locale: Locale) {
  setCookie(COOKIE_NAME, locale, {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    path: "/",
  });
}
