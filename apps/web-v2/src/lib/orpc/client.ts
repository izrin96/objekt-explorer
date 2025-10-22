import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { BatchLinkPlugin } from "@orpc/client/plugins";
import { createRouterClient, type RouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { createIsomorphicFn } from "@tanstack/react-start";
import { router } from "../server/api/routers";

const getORPCClient = createIsomorphicFn()
  .server(() => createRouterClient(router))
  .client((): RouterClient<typeof router> => {
    const link = new RPCLink({
      url: `${window.location.origin}/api/rpc`,
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

    return createORPCClient(link);
  });

export const client: RouterClient<typeof router> = getORPCClient();

export const orpc = createTanstackQueryUtils(client);
