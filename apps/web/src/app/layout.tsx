import type { Metadata } from "next";
import { Geist_Mono, Inter, Noto_Sans_KR, Noto_Sans_SC, Nunito_Sans } from "next/font/google";
import ClientProviders, { ClientArtistProvider } from "@/components/client-providers";
import "@/app/globals.css";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import type { PropsWithChildren } from "react";
import { Analytics } from "@/components/analytics";
import Navbar from "@/components/navbar";
import "@/lib/orpc/server";
import { preconnect } from "react-dom";
import { getSelectedArtists } from "@/lib/client-fetching";
import { artists } from "@/lib/server/cosmo/artists";

const inter = Inter({
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

const nunitoFont = Nunito_Sans({
  variable: "--font-nunito",
  display: "swap",
  subsets: ["latin"],
  weight: ["700"],
});

export const metadata: Metadata = {
  title: {
    template: "%s · Objekt Tracker",
    default: "Objekt Tracker",
    absolute: "Objekt Tracker",
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
  const [locale, selectedArtistIds] = await Promise.all([getLocale(), getSelectedArtists()]);

  preconnect("https://imagedelivery.net");
  preconnect("https://resources.cosmo.fans");
  preconnect("https://static.cosmo.fans");

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${inter.variable} ${geistMono.variable} ${notoSansKr.variable} ${notoSansSc.variable} ${nunitoFont.variable}`}
    >
      <body className="min-h-svh">
        <NextIntlClientProvider>
          <ClientProviders>
            <ClientArtistProvider artists={artists} selectedArtistIds={selectedArtistIds}>
              <Navbar />
              <main className="mx-auto w-full">{children}</main>
              <Analytics />
            </ClientArtistProvider>
          </ClientProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
