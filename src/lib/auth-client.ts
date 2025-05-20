import { createAuthClient } from "better-auth/react";
import { usernameClient } from "better-auth/client/plugins";
import { getBaseURL } from "./utils";

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
  plugins: [usernameClient()],
});
