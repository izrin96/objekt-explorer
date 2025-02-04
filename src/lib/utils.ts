import { env } from "@/env.mjs";
import { ValidObjekt } from "./universal/objekts";
import { isServer } from "@tanstack/react-query";

export const GRID_COLUMNS = 7;
export const GRID_COLUMNS_MOBILE = 3;

export const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";

export const overrideAccents: Record<string, string> = {
  "Divine01 SeoYeon 117Z": "#B400FF",
  "Divine01 SeoYeon 118Z": "#B400FF",
  "Divine01 SeoYeon 119Z": "#B400FF",
  "Divine01 SeoYeon 120Z": "#B400FF",
  "Divine01 SeoYeon 317Z": "#df2e37",
  "Binary01 Choerry 201Z": "#FFFFFF",
  "Binary01 Choerry 202Z": "#FFFFFF",
};

export const overrideFonts: Record<string, string> = {
  "Atom01 HeeJin 322Z": "#FFFFFF",
  "Atom01 HeeJin 323Z": "#FFFFFF",
  "Atom01 HeeJin 324Z": "#FFFFFF",
  "Atom01 HeeJin 325Z": "#FFFFFF",
};

export function overrideColor(objekt: ValidObjekt) {
  // temporary fix accent color for some collection
  const accentColor = overrideAccents[objekt.collectionId];
  const fontColor = overrideFonts[objekt.collectionId];

  return {
    backgroundColor: accentColor ?? objekt.backgroundColor,
    accentColor: accentColor ?? objekt.accentColor,
    textColor: fontColor ?? objekt.textColor,
  };
}

export function getBaseURL() {
  if (!isServer) {
    return "";
  }
  if (env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "http://localhost:3000";
}
