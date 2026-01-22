import { inferAdditionalFields, usernameClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import type { auth } from "./server/auth";

import { getBaseURL } from "./utils";

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
  plugins: [usernameClient(), inferAdditionalFields<typeof auth>()],
});
