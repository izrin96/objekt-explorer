import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { ThemeProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import type { ReactNode } from "react";
import { preconnect } from "react-dom";
import Navbar from "@/components/navbar";
import ThemeStyleProvider from "@/components/theme-style-providers";
import { Toast } from "@/components/ui/toast";
import { CosmoArtistProvider } from "@/hooks/use-cosmo-artist";
import { env } from "@/lib/env/client";
import type { orpc } from "@/lib/orpc/client";
import "core-js/es/array/at";
import "core-js/es/array/to-sorted";
import "core-js/es/array/to-reversed";
import { PostErrorComponent } from "@/components/error-boundary";
import NotFound from "@/components/not-found";
// import appCss from "../index.css?url";
import "../index.css";

export interface RouterAppContext {
  orpc: typeof orpc;
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Objekt Tracker",
      },
      {
        description: "Cosmo objekt explorer",
      },
      {
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
      },
    ],
    links: [
      { rel: "icon", href: "/favicon.ico" },
      // {
      //   rel: "stylesheet",
      //   href: appCss,
      // },
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
      { rel: "manifest", href: "/site.webmanifest" },
    ],
    scripts: [
      ...(process.env.NODE_ENV === "production"
        ? [
            {
              src: env.VITE_UMAMI_SCRIPT_URL,
              "data-website-id": env.VITE_UMAMI_WEBSITE_ID,
              defer: true,
            },
          ]
        : []),
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFound,
  errorComponent: (props) => (
    <RootDocument>
      <PostErrorComponent {...props} />
    </RootDocument>
  ),
  loader: async ({ context }) => {
    context.queryClient.prefetchQuery(context.orpc.session.queryOptions());
    context.queryClient.prefetchQuery(context.orpc.filterData.queryOptions());
    context.queryClient.prefetchQuery(context.orpc.selectedArtist.get.queryOptions());
    context.queryClient.prefetchQuery(
      context.orpc.artists.queryOptions({
        staleTime: Infinity,
      }),
    );
  },
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  preconnect("https://imagedelivery.net");
  preconnect("https://resources.cosmo.fans");
  preconnect("https://static.cosmo.fans");

  return (
    <html
      lang="en"
      suppressHydrationWarning
      style={{
        scrollbarGutter: "stable",
      }}
    >
      <head>
        <HeadContent />
      </head>
      <body className="min-h-svh">
        <div className="texture"></div>
        <NuqsAdapter>
          <ThemeProvider
            enableSystem
            attribute="class"
            defaultTheme="system"
            themes={["light", "dark"]}
          >
            <ThemeStyleProvider>
              <CosmoArtistProvider>
                <Toast />
                <Navbar />
                {children}
              </CosmoArtistProvider>
            </ThemeStyleProvider>
          </ThemeProvider>
        </NuqsAdapter>
        <Scripts />
        <ReactQueryDevtools />
      </body>
    </html>
  );
}
