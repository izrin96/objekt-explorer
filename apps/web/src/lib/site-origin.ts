import { serverEnv } from "@repo/api/env";
import { createIsomorphicFn } from "@tanstack/react-start";

/**
 * The site's public origin wherever it runs: `head` renders on the server too, where there is no
 * `window`, and a canonical link or `og:url` must be absolute.
 */
export const siteOrigin = createIsomorphicFn()
  .server(() => new URL(serverEnv.SITE_URL).origin)
  .client(() => window.location.origin);
