import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// `text-xxs` is a theme size tailwind-merge does not know; unregistered it is
// read as a text colour and silently dropped in favour of a later `text-foreground`
const twMerge = extendTailwindMerge({
  extend: { classGroups: { "font-size": [{ text: ["xxs"] }] } },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * The shared content box. `<html data-wide>` (the Wide layout setting) drops
 * the cap through one ancestor variant, rather than a prop threaded through
 * the nav, `<main>` and the profile banner.
 */
export const containerClass = "mx-auto w-full max-w-(--breakpoint-2xl) [[data-wide]_&]:max-w-none";

/**
 * A `ScrollArea` that is a horizontal strip. Its viewport scrolls both axes and
 * Base UI writes the fade distances inline, so a touch target overhanging the
 * strip would otherwise scroll it vertically and fade its bottom edge.
 *
 * A touch screen swipes the strip natively, and the custom scrollbar, invisible
 * but still hit-testable over the items' bottom edge, would take their taps.
 */
export const scrollXOnlyClass =
  "*:data-[slot=scroll-area-viewport]:overflow-y-hidden! *:data-[slot=scroll-area-viewport]:[--scroll-area-overflow-y-start:0px]! *:data-[slot=scroll-area-viewport]:[--scroll-area-overflow-y-end:0px]! *:data-[slot=scroll-area-scrollbar]:pointer-coarse:hidden";

export const SITE_NAME = "Objekt Tracker";

export const THEME_COLORS = {
  light: "#FBFBFB",
  dark: "#09090B",
};

/** The origin the user is on, for links they copy out; its callers only run in the browser. */
export function getBaseURL(): string {
  return window.location.origin;
}

/** The objekt artwork's intrinsic pixel size; the band's SVG viewBox. */
export const OBJEKT_SIZE = {
  height: 1673,
  width: 1083,
};

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
