import { createAuthClient } from "better-auth/react";
import { getBaseURL } from "./utils";

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
});
