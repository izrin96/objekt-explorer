import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { BatchLinkPlugin } from "@orpc/client/plugins";
import type { RouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";

import type { router } from "../server/api/routers";

declare global {
  var $client: RouterClient<typeof router> | undefined;
}

const link = new RPCLink({
  url: () => {
    if (typeof window === "undefined") {
      throw new Error("RPCLink is not allowed on the server side.");
    }

    return `${window.location.origin}/rpc`;
  },
  plugins: [
    new BatchLinkPlugin({
      mode: typeof window === "undefined" ? "buffered" : "streaming",
      groups: [
        {
          condition: () => true,
          context: {},
        },
      ],
    }),
  ],
});

export const client: RouterClient<typeof router> = globalThis.$client ?? createORPCClient(link);

export const orpc = createTanstackQueryUtils(client);
