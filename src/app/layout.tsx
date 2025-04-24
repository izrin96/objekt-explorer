import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Doto,
  Nunito_Sans,
} from "next/font/google";
import { Toast } from "@/components/ui";
import ClientProviders from "@/components/client-providers";
import "./globals.css";
import Navbar from "@/components/navbar";
import { Analytics } from "@/components/analytics";
import { PropsWithChildren } from "react";
import { cn } from "@/utils/classes";
import ThemeTexture from "@/components/theme-texture";

const geistSans = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const altFont = Nunito_Sans({
  variable: "--font-alt",
  weight: "700",
  subsets: ["latin"],
});

const doto = Doto({
  variable: "--font-doto",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "%s · Lunar Cosmo",
    default: "Lunar Cosmo",
    absolute: "Lunar Cosmo",
  },
  description: "Cosmo objekt explorer",
  // keywords taken from teamreflex/cosmo-web
  keywords: [
    "lunar",
    "lunar cosmo",
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

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${doto.variable} ${altFont.variable}`}
    >
      <body
        className={cn(
          "min-h-svh antialiased touch-manipulation",
          process.env.NODE_ENV === "development" ? "debug-screens" : ""
        )}
      >
        <Toast />
        <ClientProviders>
          <ThemeTexture />
          <div className="relative flex flex-col">
            <Navbar />
            <main className="flex min-w-full flex-col items-center">
              {children}
            </main>
          </div>
          <Analytics />
        </ClientProviders>
      </body>
    </html>
  );
}
