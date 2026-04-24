import { type IntlayerConfig } from "intlayer";

const config: IntlayerConfig = {
  internationalization: {
    defaultLocale: "en",
    locales: ["en", "ko"],
  },
  content: {
    contentDir: ["./src/i18n/content"],
  },
};

export default config;
