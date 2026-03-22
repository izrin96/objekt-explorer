import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import type { ReactNode } from "react";

import ClientProviders from "./components/client-providers";
import { DefaultCatchBoundary } from "./components/DefaultCatchBoundary";
import { NotFound } from "./components/NotFound";
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
    defaultErrorComponent: DefaultCatchBoundary,
    defaultNotFoundComponent: () => <NotFound />,
    scrollRestoration: true,
    Wrap: (props: { children: ReactNode }) => {
      return <ClientProviders>{props.children}</ClientProviders>;
    },
  });

  setupRouterSsrQueryIntegration({
    router,
    queryClient,
  });

  return router;
}

export type AppRouter = ReturnType<typeof getRouter>;
