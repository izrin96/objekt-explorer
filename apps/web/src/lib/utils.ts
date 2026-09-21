import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import { clientEnv } from "./env/client";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * The shared content box. `<html data-wide>` (the Wide layout setting) drops
 * the cap through one ancestor variant, rather than a prop threaded through
 * the nav, `<main>` and the profile banner.
 */
export const containerClass = "mx-auto w-full max-w-(--breakpoint-2xl) [[data-wide]_&]:max-w-none";

export const SITE_NAME = "Objekt Tracker";

export const THEME_COLORS = {
  light: "#FBFBFB",
  dark: "#09090B",
};

/** Better Auth needs an absolute origin; the dev port differs from production. */
export function getBaseURL(): string {
  return clientEnv.VITE_SITE_URL;
}

/** The column count each breakpoint opens on, until the user picks one. */
export const GRID_COLUMNS = 7;
export const GRID_COLUMNS_TABLET = 5;
export const GRID_COLUMNS_MOBILE = 3;

/**
 * A `redirect` search value is only followed when it is a same-origin path:
 * `//evil.example` is a protocol-relative URL the browser resolves off-site.
 */
export function isSafeRedirect(value: string): boolean {
  return /^\/(?!\/)/.test(value);
}

/** the column counts `profile.edit` accepts */
export const validColumns = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18] as const;
