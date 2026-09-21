import { createMetadataGenerator } from "tanstack-meta";

import { clientEnv } from "./env/client";
import { SITE_NAME } from "./utils";

export const generateMetadata = createMetadataGenerator({
  baseUrl: clientEnv.VITE_SITE_URL,
  titleTemplate: {
    template: `%s · ${SITE_NAME}`,
    default: SITE_NAME,
  },
});
