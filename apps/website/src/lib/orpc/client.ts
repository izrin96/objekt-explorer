import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { BatchLinkPlugin } from "@orpc/client/plugins";
import type { RouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { createIsomorphicFn } from "@tanstack/react-start";

import type { router } from "../server/api/routers";

const getClientLink = createIsomorphicFn()
  .client(
    () =>
      new RPCLink({
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
      }),
  )
  .server(
    () =>
      new RPCLink({
        url: "http://localhost:3000/api/rpc",
        headers: () => getRequestHeaders(),
      }),
  );

export const client: RouterClient<typeof router> = getClientLink();

export const orpc = createTanstackQueryUtils(client);
