import type { auth } from "@repo/api/services/auth";
import { inferAdditionalFields, usernameClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// no `baseURL`: the client follows the page's own origin, so a build never pins
// the domain it signs in on; the server's runtime `VITE_SITE_URL` decides which
// origin it accepts
export const authClient = createAuthClient({
  plugins: [usernameClient(), inferAdditionalFields<typeof auth>()],
});
