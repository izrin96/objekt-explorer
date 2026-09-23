import instrumentSansLatin from "@fontsource-variable/instrument-sans/files/instrument-sans-latin-wght-normal.woff2?url";
import { type QueryClient } from "@tanstack/react-query";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useLocation,
} from "@tanstack/react-router";
import { type ReactNode, useEffect } from "react";

import { AppNav } from "@/components/layout/app-nav";
import { ToastProvider } from "@/components/ui/toast";
import { CosmoArtistProvider } from "@/features/artist/cosmo-artist-provider";
import { FilterDataProvider } from "@/features/filters/filter-data-provider";
import { currentUserOptions } from "@/features/user/queries";
import { startOverflowGuard } from "@/lib/dev-overflow-guard";
import { clientEnv } from "@/lib/env/client";
import { generateMetadata } from "@/lib/meta";
import { orpc } from "@/lib/orpc";
import { SITE_NAME, THEME_COLORS } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { LEGACY_CONFIG_KEY, LEGACY_THEME_KEY } from "@/stores/legacy-storage";
import { SETTINGS_STORAGE_KEY, useApplySettings } from "@/stores/settings";

import appCss from "@/styles/app.css?url";

export interface RouterContext {
  queryClient: QueryClient;
}

/**
 * Runs before the first paint, so a persisted Dark setting never flashes the
 * light page, and points `theme-color` at the same theme for the status bar.
 * `useApplySettings` keeps the same attributes in sync
 * afterwards; the two rules have to agree. It reads the website's keys as a
 * fallback for the same reason `seededStorage` does — the store seeds itself
 * from them, but only once this script has already painted.
 */
const applySettingsScript = `(function(){try{var s=JSON.parse(localStorage.getItem(${JSON.stringify(
  SETTINGS_STORAGE_KEY,
)})||"{}").state;if(!s){var t=localStorage.getItem(${JSON.stringify(
  LEGACY_THEME_KEY,
)});s={theme:t==="dark"?"Dark":t==="light"?"Light":"System",wide:JSON.parse(localStorage.getItem(${JSON.stringify(
  LEGACY_CONFIG_KEY,
)})||"{}").state?.wide};}var d=document.documentElement,k=s.theme==="Dark"||(s.theme!=="Light"&&matchMedia("(prefers-color-scheme: dark)").matches),c=document.querySelector('meta[name="theme-color"]');d.classList.toggle("dark",k);if(c)c.setAttribute("content",k?${JSON.stringify(
  THEME_COLORS.dark,
)}:${JSON.stringify(THEME_COLORS.light)});if(s.wide)d.dataset.wide="true";}catch(e){}})();`;

export const Route = createRootRouteWithContext<RouterContext>()({
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData(orpc.config.getArtists.queryOptions()),
      queryClient.ensureQueryData(orpc.config.getSelectedArtists.queryOptions()),
      queryClient.ensureQueryData(orpc.config.getFilterData.queryOptions()),
      queryClient.ensureQueryData(currentUserOptions),
    ]);
  },
  head: () => {
    const { meta, links } = generateMetadata({
      charSet: "utf-8",
      applicationName: SITE_NAME,
      manifest: "/site.webmanifest",
      appleWebApp: {
        title: SITE_NAME,
        capable: true,
        statusBarStyle: "default",
      },
      viewport: {
        width: "device-width",
        initialScale: 1,
        maximumScale: 1,
        colorScheme: "light dark",
        // one only: React collapses two <meta name="theme-color"> into the last
        themeColor: THEME_COLORS.dark,
      },
      referrer: "origin-when-cross-origin",
      formatDetection: { telephone: false },
      description: m.home_description(),
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
          { url: "/favicon.svg", type: "image/svg+xml" },
          { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
          { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
          { url: "/favicon.ico" },
        ],
        apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
      },
    });

    return {
      meta,
      links: [
        { rel: "preconnect", href: "https://imagedelivery.net" },
        { rel: "preconnect", href: "https://resources.cosmo.fans" },
        { rel: "preconnect", href: "https://static.cosmo.fans" },
        { rel: "preconnect", href: "https://media.objekt.top" },
        {
          rel: "preload",
          href: instrumentSansLatin,
          as: "font",
          type: "font/woff2",
          crossOrigin: "anonymous",
        },
        {
          rel: "stylesheet",
          href: appCss,
        },
        ...links,
      ],
      scripts:
        import.meta.env.DEV || !clientEnv.VITE_UMAMI_WEBSITE_ID
          ? []
          : [
              {
                defer: true,
                src: "/m/s",
                "data-host-url": "/m",
                "data-website-id": clientEnv.VITE_UMAMI_WEBSITE_ID,
              },
            ],
    };
  },
  shellComponent: RootDocument,
  component: RootComponent,
});

function OverflowGuard() {
  const pathname = useLocation({ select: (s) => s.pathname });

  useEffect(() => startOverflowGuard(() => pathname), [pathname]);

  return null;
}

function RootComponent() {
  useApplySettings();

  return (
    <ToastProvider position="bottom-right">
      <CosmoArtistProvider>
        <FilterDataProvider>
          <AppNav />
          {/* `clip` rather than `hidden`: it creates no scroll container, so a
              sticky nav still works, and no page can scroll sideways */}
          <div className="min-h-svh overflow-x-clip">
            <Outlet />
          </div>
        </FilterDataProvider>
      </CosmoArtistProvider>
      {import.meta.env.DEV && <OverflowGuard />}
    </ToastProvider>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang={getLocale()} dir="ltr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: applySettingsScript }} />
        <HeadContent />
      </head>
      <body className="text-foreground font-sans antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  );
}
