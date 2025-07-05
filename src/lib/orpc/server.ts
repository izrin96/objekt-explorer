"server only";

import { createRouterClient } from "@orpc/server";
import { headers } from "next/headers";
import { router } from "../server/api/routers";

globalThis.$client = createRouterClient(router, {
  context: async () => ({
    headers: await headers(),
  }),
});
