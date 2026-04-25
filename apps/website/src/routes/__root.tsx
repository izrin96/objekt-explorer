import type { QueryClient } from "@tanstack/react-query";
import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from "@tanstack/react-router";
import * as React from "react";

import ClientProviders from "@/components/client-providers";
import Navbar from "@/components/navbar";
import NotFound from "@/components/not-found";
import { CosmoArtistProvider } from "@/hooks/use-cosmo-artist";
import { FilterDataProvider } from "@/hooks/use-filter-data";
import { clientEnv } from "@/lib/env/client";
import { orpc } from "@/lib/orpc/client";

import appCss from "@/styles/app.css?url";

export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1" },
      { title: "Objekt Tracker" },
      { name: "description", content: "Cosmo objekt explorer" },
      {
        name: "keywords",
        content:
          "lunar,kpop,modhaus,모드하우스,cosmo,objekt,tripleS,idntt,트리플에스,artms,artemis,아르테미스",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Geist+Mono:wght@100..900&family=Noto+Sans+KR:wght@100..900&family=Noto+Sans+SC:wght@100..900&display=swap",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Google+Sans+Flex:wght@100..900&display=swap",
      },
      {
        rel: "apple-touch-icon",
        sizes: "180x180",
        href: "/apple-touch-icon.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: "/favicon-32x32.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "16x16",
        href: "/favicon-16x16.png",
      },
      { rel: "icon", href: "/favicon.ico" },
      { rel: "preconnect", href: "https://imagedelivery.net" },
      { rel: "preconnect", href: "https://resources.cosmo.fans" },
      { rel: "preconnect", href: "https://static.cosmo.fans" },
    ],
    scripts: clientEnv.VITE_UMAMI_SCRIPT_URL
      ? [
          {
            src: clientEnv.VITE_UMAMI_SCRIPT_URL,
            "data-website-id": clientEnv.VITE_UMAMI_WEBSITE_ID,
            defer: true,
          },
        ]
      : [],
  }),
  // errorComponent: DefaultCatchBoundary,
  notFoundComponent: () => <NotFound />,
  shellComponent: RootDocument,
  component: RootComponent,
  loader: async ({ context: { queryClient } }) => {
    const filterData = await queryClient.ensureQueryData(orpc.config.getFilterData.queryOptions());
    const artists = await queryClient.ensureQueryData(orpc.config.getArtists.queryOptions());
    return {
      filterData,
      artists,
    };
  },
});

function RootComponent() {
  const { artists, filterData } = Route.useLoaderData();
  return (
    <CosmoArtistProvider artists={artists}>
      <FilterDataProvider data={filterData}>
        <Navbar />
        <main>
          <Outlet />
        </main>
      </FilterDataProvider>
    </CosmoArtistProvider>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  // const params = Route.useParams();
  // const locale = params?.locale ?? defaultLocale;

  return (
    <html lang={"en"} dir="ltr" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="bg-bg text-fg font-sans antialiased">
        <ClientProviders locale="en">
          <div className="relative flex min-h-svh flex-col">{children}</div>
        </ClientProviders>
        <Scripts />
      </body>
    </html>
  );
}
