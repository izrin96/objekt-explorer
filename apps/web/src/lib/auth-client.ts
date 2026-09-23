import type { auth } from "@repo/api/services/auth";
import { inferAdditionalFields, usernameClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { getBaseURL } from "./utils";

export const authClient = createAuthClient({
  // in dev the client follows the page's own origin, so a LAN address signs in too
  baseURL: import.meta.env.DEV ? undefined : getBaseURL(),
  plugins: [usernameClient(), inferAdditionalFields<typeof auth>()],
});
