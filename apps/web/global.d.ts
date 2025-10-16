// import { locales } from "@/i18n/config";
import type messages from "./messages/en.json";

declare module "next-intl" {
  interface AppConfig {
    // Locale: (typeof locales)[number];
    Messages: typeof messages;
  }
}
