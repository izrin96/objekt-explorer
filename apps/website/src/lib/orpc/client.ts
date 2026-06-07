import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { BatchLinkPlugin } from "@orpc/client/plugins";
import type { RouterClient } from "@orpc/server";
import { createRouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { router } from "../server/api/routers";

const getORPCClient = createIsomorphicFn()
  .client((): RouterClient<typeof router> => {
    const link = new RPCLink({
      url: () => {
        return `${window.location.origin}/rpc`;
      },
      plugins: [
        new BatchLinkPlugin({
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
  })
  .server(() =>
    createRouterClient(router, {
      context: async () => ({
        headers: getRequestHeaders(),
      }),
    }),
  );

export const client: RouterClient<typeof router> = getORPCClient();

export const orpc = createTanstackQueryUtils(client);
