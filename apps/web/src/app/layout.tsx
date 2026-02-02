import type { Metadata } from "next";

import { NextIntlClientProvider } from "next-intl";

import "@/app/globals.css";
import { Geist_Mono, Google_Sans_Flex, Noto_Sans_KR, Noto_Sans_SC } from "next/font/google";
import { Suspense, type PropsWithChildren } from "react";
import { preconnect } from "react-dom";

import { Analytics } from "@/components/analytics";
import "@/lib/orpc/server";
import ClientProviders, { ClientArtistProvider } from "@/components/client-providers";
import Navbar from "@/components/navbar";
import { Loader } from "@/components/ui/loader";
import { getSelectedArtists } from "@/lib/client-fetching";
import { getQueryClient, HydrateClient } from "@/lib/query/hydration";
import { getSession } from "@/lib/server/auth";
import { artists } from "@/lib/server/cosmo/artists";
import { fetchFilterData } from "@/lib/server/objekts/filter-data";
import { SITE_NAME } from "@/lib/utils";

const inter = Google_Sans_Flex({
  variable: "--font-inter",
  display: "swap",
  subsets: ["latin"],
  weight: "variable",
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
  preconnect("https://imagedelivery.net");
  preconnect("https://resources.cosmo.fans");
  preconnect("https://static.cosmo.fans");

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${geistMono.variable} ${notoSansKr.variable} ${notoSansSc.variable}`}
    >
      <body className="min-h-svh font-sans antialiased">
        <ClientProviders>
          <Suspense fallback={<Loading />}>
            <Providers>{children}</Providers>
          </Suspense>
        </ClientProviders>
      </body>
    </html>
  );
}

function Loading() {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-2">
      <Loader variant="ring" />
    </div>
  );
}

async function Providers({ children }: PropsWithChildren) {
  const selectedArtistIds = await getSelectedArtists();
  const queryClient = getQueryClient();

  void queryClient.prefetchQuery({
    queryKey: ["session"],
    queryFn: () => getSession(),
  });

  void queryClient.prefetchQuery({
    queryKey: ["filter-data"],
    queryFn: fetchFilterData,
  });

  return (
    <NextIntlClientProvider>
      <ClientArtistProvider artists={artists} selectedArtistIds={selectedArtistIds}>
        <HydrateClient client={queryClient}>
          <Navbar />
          <main className="mx-auto w-full">{children}</main>
          <Analytics />
        </HydrateClient>
      </ClientArtistProvider>
    </NextIntlClientProvider>
  );
}
