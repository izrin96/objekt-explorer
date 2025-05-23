import { createAuthClient } from "better-auth/react";
import {
  inferAdditionalFields,
  usernameClient,
} from "better-auth/client/plugins";
import { getBaseURL } from "./utils";
import { auth } from "./server/auth";

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
  plugins: [usernameClient(), inferAdditionalFields<typeof auth>()],
});
