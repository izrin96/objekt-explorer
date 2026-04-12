"use server";

import { cookies } from "next/headers";

import type { Locale } from "../utils";

const defaultLocale = "en";
const COOKIE_NAME = "NEXT_LOCALE";

export async function getUserLocale(): Promise<Locale> {
  const cookie = (await cookies()).get(COOKIE_NAME)?.value;
  return cookie === "en" || cookie === "ko" ? cookie : defaultLocale;
}

export async function setUserLocale(locale: Locale) {
  (await cookies()).set(COOKIE_NAME, locale, {
    maxAge: 12 * 60 * 60 * 24 * 30,
  });
}
