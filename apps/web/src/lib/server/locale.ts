"use server";

import { Locales, type Locale } from "intlayer";
import { cookies } from "next/headers";

const defaultLocale = Locales.ENGLISH;
const COOKIE_NAME = "NEXT_LOCALE";

export async function getUserLocale(): Promise<Locale> {
  const cookie = (await cookies()).get(COOKIE_NAME)?.value;
  return cookie === Locales.ENGLISH || cookie === Locales.KOREAN ? cookie : defaultLocale;
}

export async function setUserLocale(locale: Locale) {
  (await cookies()).set(COOKIE_NAME, locale, {
    maxAge: 12 * 60 * 60 * 24 * 30,
  });
}
