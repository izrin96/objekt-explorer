import type { auth } from "@repo/api/services/auth";
import { inferAdditionalFields, usernameClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { getBaseURL } from "./utils";

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
  plugins: [usernameClient(), inferAdditionalFields<typeof auth>()],
});
