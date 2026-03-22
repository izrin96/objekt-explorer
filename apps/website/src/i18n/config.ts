export const locales = ["en", "ko"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";
