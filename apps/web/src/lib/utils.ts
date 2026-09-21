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
