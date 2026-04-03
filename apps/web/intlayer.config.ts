import { Locales, type IntlayerConfig } from "intlayer";

const config: IntlayerConfig = {
  internationalization: {
    defaultLocale: Locales.ENGLISH,
    locales: [Locales.ENGLISH, Locales.KOREAN],
  },
  content: {
    contentDir: ["./src/i18n/content"],
  },
};

export default config;
