import type { Metadata } from "next";
import { Geist_Mono, Inter, Noto_Sans_SC, Nunito_Sans } from "next/font/google";
import localFont from "next/font/local";
import ClientProviders from "@/components/client-providers";
import "./globals.css";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import type { PropsWithChildren } from "react";
import { Analytics } from "@/components/analytics";
import Navbar from "@/components/navbar";
import { cn } from "@/utils/classes";
import "../lib/orpc/server";
import { getSelectedArtists } from "@/lib/client-fetching";
import { artists } from "@/lib/server/cosmo/artists";
import { classArtist, seasonArtist } from "@/lib/universal/cosmo/filter-data";

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

const pretendard = localFont({
  variable: "--font-pretendard",
  src: "./fonts/PretendardVariable.woff2",
  display: "swap",
});

const notoSansSc = Noto_Sans_SC({
  variable: "--font-noto-sans-sc",
  display: "swap",
  weight: "variable",
  preload: false,
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
  description: "Cosmo objekt explorer (formerly Lunar Cosmo)",
  // keywords taken from teamreflex/cosmo-web
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
};

export default async function RootLayout({ children }: PropsWithChildren) {
  const [locale, selectedArtistIds] = await Promise.all([getLocale(), getSelectedArtists()]);
  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${inter.variable} ${geistMono.variable} ${pretendard.variable} ${notoSansSc.variable} ${nunitoFont.variable}`}
    >
      <body
        className={cn(
          "min-h-svh antialiased",
          process.env.NODE_ENV === "development" ? "debug-screens" : "",
        )}
      >
        <NextIntlClientProvider>
          <ClientProviders
            artists={artists}
            selectedArtistIds={selectedArtistIds}
            season={seasonArtist}
            classes={classArtist}
          >
            <Navbar />
            <main className="mx-auto w-full">{children}</main>
            <Analytics />
          </ClientProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
