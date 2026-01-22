import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/server/auth";

export const { POST, GET } = toNextJsHandler(auth);
