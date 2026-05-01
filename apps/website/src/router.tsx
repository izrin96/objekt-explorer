import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

import { CommonErrorComponent } from "./components/error-boundary";
import { NotFoundComponent } from "./components/notfound-component";
import { PendingComponent } from "./components/pending-component";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: {
      queryClient,
    },
    defaultPreload: "intent",
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultStaleTime: 0,
    defaultErrorComponent: CommonErrorComponent,
    defaultPendingComponent: PendingComponent,
    defaultNotFoundComponent: NotFoundComponent,
  });

  setupRouterSsrQueryIntegration({
    router,
    queryClient,
  });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
