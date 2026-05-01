import { useSuspenseQuery, type QueryClient } from "@tanstack/react-query";
import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from "@tanstack/react-router";
import * as React from "react";

import ClientProviders from "@/components/client-providers";
import { Toast } from "@/components/intentui/toast-custom";
import Navbar from "@/components/navbar";
import { CosmoArtistProvider } from "@/hooks/use-cosmo-artist";
import { FilterDataProvider } from "@/hooks/use-filter-data";
import { clientEnv } from "@/lib/env/client";
import { generateMetadata } from "@/lib/meta";
import { orpc } from "@/lib/orpc/client";
import { sessionOptions } from "@/lib/query-options";

import appCss from "@/styles/app.css?url";

export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  loader: async ({ context: { queryClient } }) => {
    void queryClient.prefetchQuery(orpc.config.getLocale.queryOptions());
    void queryClient.prefetchQuery(orpc.config.getArtists.queryOptions());
    void queryClient.prefetchQuery(orpc.config.getFilterData.queryOptions());
    void queryClient.prefetchQuery(orpc.config.getSelectedArtists.queryOptions());
    void queryClient.prefetchQuery(sessionOptions);
  },
  head: () => {
    const { meta, links } = generateMetadata({
      charSet: "utf-8",
      viewport: {
        width: "device-width",
        initialScale: 1,
        maximumScale: 1,
      },
      description: "Cosmo objekt explorer",
      keywords: [
        "lunar",
        "kpop",
        "modhaus",
        "모드하우스",
        "cosmo",
        "objekt",
        "tripleS",
        "idntt",
        "트리플에스",
        "artms",
        "artemis",
        "아르테미스",
        "아르테미스 스트래티지",
        "odd eye circle",
        "오드아이써클",
        "loona",
        "이달의 소녀",
      ],
      icons: {
        icon: [
          { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
          { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
          { url: "/favicon.ico" },
        ],
        apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
      },
      // todo: add webmanifest?
      // manifest: "/site.webmanifest",
    });

    return {
      meta,
      links: [
        {
          rel: "stylesheet",
          href: appCss,
        },
        { rel: "preconnect", href: "https://imagedelivery.net" },
        { rel: "preconnect", href: "https://resources.cosmo.fans" },
        { rel: "preconnect", href: "https://static.cosmo.fans" },
        ...links,
      ],
      scripts: import.meta.env.DEV
        ? []
        : [
            {
              defer: true,
              src: clientEnv.VITE_UMAMI_SCRIPT_URL,
              "data-website-id": clientEnv.VITE_UMAMI_WEBSITE_ID,
            },
          ],
    };
  },
  shellComponent: RootDocument,
  component: RootComponent,
});

function RootComponent() {
  const { data: locale } = useSuspenseQuery(orpc.config.getLocale.queryOptions());
  return (
    <ClientProviders locale={locale}>
      <CosmoArtistProvider>
        <FilterDataProvider>
          <div className="relative flex min-h-svh flex-col">
            <Navbar />
            <main>
              <Outlet />
            </main>
          </div>
          <Toast />
        </FilterDataProvider>
      </CosmoArtistProvider>
    </ClientProviders>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning className="overflow-y-scroll">
      <head>
        <HeadContent />
      </head>
      <body className="bg-bg text-fg font-sans antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  );
}
