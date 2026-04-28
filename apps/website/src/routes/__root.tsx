import { FileDashedIcon } from "@phosphor-icons/react/dist/ssr";
import type { QueryClient } from "@tanstack/react-query";
import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from "@tanstack/react-router";
import * as React from "react";
import { useIntlayer } from "react-intlayer";

import ClientProviders from "@/components/client-providers";
import { CommonErrorComponent } from "@/components/error-boundary";
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
    const [filterData, artists, locale] = await Promise.all([
      orpc.config.getFilterData.call(),
      orpc.config.getArtists.call(),
      orpc.config.getLocale.call(),
    ]);
    void queryClient.prefetchQuery(sessionOptions);
    return {
      filterData,
      artists,
      locale,
    };
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
      scripts:
        import.meta.env.PROD && clientEnv.VITE_UMAMI_SCRIPT_URL
          ? [
              {
                src: clientEnv.VITE_UMAMI_SCRIPT_URL,
                "data-website-id": clientEnv.VITE_UMAMI_WEBSITE_ID,
                defer: true,
              },
            ]
          : [],
    };
  },
  errorComponent: CommonErrorComponent,
  notFoundComponent: NotFoundComponent,
  shellComponent: RootDocument,
  component: RootComponent,
});

function NotFoundComponent() {
  const content = useIntlayer("not_found");
  return (
    <div className="flex w-full flex-col items-center justify-center gap-2 py-12 font-semibold">
      <FileDashedIcon size={72} weight="thin" />
      {content.page.value}
    </div>
  );
}

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
  const { locale } = Route.useLoaderData();

  return (
    <html lang={locale} dir="ltr" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="bg-bg text-fg font-sans antialiased">
        <ClientProviders locale={locale}>
          <div className="relative flex min-h-svh flex-col">{children}</div>
        </ClientProviders>
        <Scripts />
      </body>
    </html>
  );
}
