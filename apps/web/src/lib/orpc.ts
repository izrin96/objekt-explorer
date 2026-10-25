import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { BatchLinkPlugin } from "@orpc/client/plugins";
import type { RouterClient } from "@orpc/server";
import { createRouterClient, onError } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { router } from "@repo/api";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { captureServerError } from "@/lib/server/error-tracking";

const getORPCClient = createIsomorphicFn()
  .client((): RouterClient<typeof router> => {
    const link = new RPCLink({
      url: () => `${window.location.origin}/rpc`,
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
      // SSR calls procedures in process, past the /rpc handler that reports its errors
      interceptors: [
        onError((error, { path }) => captureServerError(error, { procedure: path.join(".") })),
      ],
      context: async () => ({
        headers: getRequestHeaders(),
      }),
    }),
  );

export const client: RouterClient<typeof router> = getORPCClient();

export const orpc = createTanstackQueryUtils(client);
