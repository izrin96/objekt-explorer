import type { Metadata } from "next";
import { IntlayerClientProvider } from "next-intlayer";

import "@/app/globals.css";
import { Geist_Mono, Google_Sans_Flex, Noto_Sans_KR, Noto_Sans_SC } from "next/font/google";
import { type PropsWithChildren } from "react";

import { Analytics } from "@/components/analytics";
import "@/lib/orpc/server";
import ClientProviders from "@/components/client-providers";
import Navbar from "@/components/navbar";
import { CosmoArtistProvider } from "@/hooks/use-cosmo-artist";
import { FilterDataProvider } from "@/hooks/use-filter-data";
import { orpc } from "@/lib/orpc/client";
import { getQueryClient, HydrateClient } from "@/lib/query/hydration";
import { getSession } from "@/lib/server/auth";
import { artists } from "@/lib/server/cosmo/artists";
import { getUserLocale } from "@/lib/server/locale";
import { SITE_NAME, cn } from "@/lib/utils";

const inter = Google_Sans_Flex({
  variable: "--font-inter",
  display: "swap",
  subsets: ["latin"],
  weight: "variable",
  adjustFontFallback: false,
  fallback: [],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  display: "swap",
  subsets: ["latin"],
  weight: "variable",
});

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  display: "swap",
  weight: "variable",
  subsets: ["latin"],
});

const notoSansSc = Noto_Sans_SC({
  variable: "--font-noto-sans-sc",
  display: "swap",
  weight: "variable",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: `%s · ${SITE_NAME}`,
    default: SITE_NAME,
    absolute: SITE_NAME,
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
      { url: "/favicon.ico" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  // manifest: "/site.webmanifest",
};

export default async function RootLayout({ children }: PropsWithChildren) {
  const locale = await getUserLocale();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={cn(inter.variable, geistMono.variable, notoSansKr.variable, notoSansSc.variable)}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.theme === 'dark' || ((!('theme' in localStorage) || localStorage.theme === 'system') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.querySelector('meta[name="theme-color"]').setAttribute('content', '#09090b')
                }
              } catch (_) {}
            `,
          }}
        />
        <meta name="theme-color" content="var(--bg)" />
      </head>
      <body className="min-h-svh font-sans antialiased">
        <ClientProviders>
          <Providers locale={locale}>
            <Navbar />
            <main className="mx-auto w-full">{children}</main>
            <Analytics />
          </Providers>
        </ClientProviders>
      </body>
    </html>
  );
}

type ProvidersProps = PropsWithChildren<{ locale: string }>;

async function Providers({ children, locale }: ProvidersProps) {
  const queryClient = getQueryClient();

  const filterData = await queryClient.ensureQueryData(orpc.config.getFilterData.queryOptions());

  void queryClient.prefetchQuery(orpc.config.getArtists.queryOptions());

  void queryClient.prefetchQuery({
    queryKey: ["session"],
    queryFn: () => getSession(),
  });

  return (
    <HydrateClient client={queryClient}>
      <IntlayerClientProvider locale={locale}>
        <CosmoArtistProvider artists={artists}>
          <FilterDataProvider data={filterData}>{children}</FilterDataProvider>
        </CosmoArtistProvider>
      </IntlayerClientProvider>
    </HydrateClient>
  );
}
