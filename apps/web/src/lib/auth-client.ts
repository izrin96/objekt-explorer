import type { auth } from "@repo/api/services/auth";
import { adminClient, inferAdditionalFields, usernameClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// no `baseURL`: the client follows the page's own origin, so a build never pins
// the domain it signs in on; the server's runtime `SITE_URL` decides which
// origin it accepts
export const authClient = createAuthClient({
  // for the session's role and ban fields only: no role holds a plugin permission, and staff
  // actions go through the audited moderation router, never `authClient.admin.*`
  plugins: [usernameClient(), inferAdditionalFields<typeof auth>(), adminClient()],
});
