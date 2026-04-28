import { createMetadataGenerator } from "tanstack-meta";

import { getBaseURL, SITE_NAME } from "./utils";

export const generateMetadata = createMetadataGenerator({
  titleTemplate: {
    template: `%s · ${SITE_NAME}`,
    default: SITE_NAME,
  },
  baseUrl: getBaseURL(),
});
