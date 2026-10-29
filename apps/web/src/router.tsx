import { QueryCache, QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

import { ErrorComponent } from "./components/router/error-boundary";
import { NotFoundComponent } from "./components/router/not-found";
import { PendingComponent } from "./components/router/pending";
import { parseSearch, stringifySearch } from "./features/filters/search-params";
import { currentUserOptions } from "./features/user/queries";
import { isUnauthorized } from "./lib/orpc-error";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  const queryClient = new QueryClient({
    queryCache: new QueryCache({
      // the session ended under a tab that still shows a user (expired, or signed out in another
      // tab): refetching the user signs it out, as a refused socket renewal does, and unmounts
      // the bell and messages icon that poll
      onError: (error) => {
        if (!isUnauthorized(error)) return;
        const { queryKey } = currentUserOptions;
        if (!queryClient.getQueryData(queryKey) || queryClient.isFetching({ queryKey }) > 0) return;
        void queryClient.invalidateQueries({ queryKey }).then(() => router.invalidate());
      },
    }),
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
    /** the profile, lowercase, whose Message button opened the thread */
    fromProfile?: string;
  }
}
