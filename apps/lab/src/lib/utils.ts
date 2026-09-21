import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * The shared content box: nav, `<main>` and the profile banner all line up on
 * it. `<html data-wide>` (the Wide layout setting) drops the cap, so the grid
 * can use the whole viewport — one ancestor variant instead of a prop through
 * three components.
 */
export const containerClass = "mx-auto w-full max-w-(--breakpoint-2xl) [[data-wide]_&]:max-w-none";
