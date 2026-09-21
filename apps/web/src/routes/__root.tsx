import spaceGroteskLatin from "@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2?url";
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
import { currentUserOptions } from "@/features/user/queries";
import { startOverflowGuard } from "@/lib/dev-overflow-guard";
import { generateMetadata } from "@/lib/meta";
import { orpc } from "@/lib/orpc";
import { SITE_NAME, THEME_COLORS } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { SETTINGS_STORAGE_KEY, useApplySettings } from "@/stores/settings";

import appCss from "@/styles/app.css?url";

export interface RouterContext {
  queryClient: QueryClient;
}

/**
 * Runs before the first paint, so a persisted Dark setting never flashes the
 * light page. `useApplySettings` keeps the same two attributes in sync
 * afterwards; the two rules have to agree.
 */
const applySettingsScript = `(function(){try{var s=JSON.parse(localStorage.getItem(${JSON.stringify(
  SETTINGS_STORAGE_KEY,
)})||"{}").state||{};var d=document.documentElement;d.classList.toggle("dark",s.theme==="Dark"||(s.theme!=="Light"&&matchMedia("(prefers-color-scheme: dark)").matches));if(s.wide)d.dataset.wide="true";}catch(e){}})();`;

export const Route = createRootRouteWithContext<RouterContext>()({
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData(orpc.config.getArtists.queryOptions()),
      queryClient.ensureQueryData(orpc.config.getSelectedArtists.queryOptions()),
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
          href: spaceGroteskLatin,
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
        <AppNav />
        {/* `clip` rather than `hidden`: it creates no scroll container, so a
            sticky nav still works, and no page can scroll sideways */}
        <div className="min-h-svh overflow-x-clip">
          <Outlet />
        </div>
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
      <body className="bg-background text-foreground font-sans antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  );
}
