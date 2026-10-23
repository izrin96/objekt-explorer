import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

import { ErrorComponent } from "./components/router/error-boundary";
import { NotFoundComponent } from "./components/router/not-found";
import { PendingComponent } from "./components/router/pending";
import { parseSearch, stringifySearch } from "./features/filters/search-params";
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
    parseSearch,
    stringifySearch,
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultStaleTime: 0,
    defaultErrorComponent: ErrorComponent,
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
  interface StaticDataRouteOption {
    /** false on a page that brings its own heading, so the section's header and tabs give way */
    tradeChrome?: boolean;
  }
  interface HistoryState {
    /** the thread was opened by a Message button, so its back button returns to that page */
    fromMessage?: boolean;
  }
}
