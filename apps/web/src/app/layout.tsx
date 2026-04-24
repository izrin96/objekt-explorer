import type { Metadata, Viewport } from "next";

import "@/app/globals.css";
import { PublicEnvScript } from "next-runtime-env";
import { Noto_Sans_KR, Noto_Sans_SC, Fira_Code, Google_Sans_Flex } from "next/font/google";
import { type PropsWithChildren } from "react";

import "@/lib/orpc/server";
import Analytics from "@/components/analytics";
import ClientProviders from "@/components/client-providers";
import Navbar from "@/components/navbar";
import { getUserLocale } from "@/lib/server/locale";
import { SITE_NAME, cn } from "@/lib/utils";

import { Providers } from "./providers";

const googleSansFlex = Google_Sans_Flex({
  subsets: ["latin"],
  weight: "variable",
  variable: "--font-google-sans-flex",
  fallback: [],
});

const firaCodeFiraCode = Fira_Code({
  subsets: ["cyrillic", "cyrillic-ext", "greek", "greek-ext", "latin", "latin-ext", "symbols2"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-fira-code",
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

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
      dir="ltr"
      suppressHydrationWarning
      className={cn(
        notoSansKr.variable,
        notoSansSc.variable,
        googleSansFlex.variable,
        firaCodeFiraCode.variable,
      )}
    >
      <head>
        <PublicEnvScript />
      </head>
      <body className="bg-bg text-fg font-sans antialiased">
        <div className="relative flex min-h-svh flex-col">
          <ClientProviders locale={locale}>
            <Providers>
              <Navbar />
              <main>{children}</main>
              <Analytics />
            </Providers>
          </ClientProviders>
        </div>
      </body>
    </html>
  );
}
