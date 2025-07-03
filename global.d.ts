import type messages from "./messages/en.json";

const locales = ["en", "ko"] as const;

declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof locales)[number];
    Messages: typeof messages;
  }
}
