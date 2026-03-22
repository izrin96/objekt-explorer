import { createRouter } from "@tanstack/react-router";

import { DefaultCatchBoundary } from "./components/DefaultCatchBoundary";
import { NotFound } from "./components/NotFound";
import type { RouterContext } from "./routes/__root";
import { routeTree } from "./routeTree.gen";

export function getRouter(context: RouterContext) {
  return createRouter({
    routeTree,
    defaultPreload: "intent",
    defaultErrorComponent: DefaultCatchBoundary,
    defaultNotFoundComponent: () => <NotFound />,
    scrollRestoration: true,
    context,
  });
}

export type AppRouter = ReturnType<typeof getRouter>;
