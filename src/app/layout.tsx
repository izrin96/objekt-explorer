import type { Metadata } from "next";
import { Geist, Geist_Mono, Nunito_Sans } from "next/font/google";
import localFont from "next/font/local";
import ClientProviders from "@/components/client-providers";
import "./globals.css";
import Navbar from "@/components/navbar";
import { Analytics } from "@/components/analytics";
import { PropsWithChildren } from "react";
import { cn } from "@/utils/classes";
import { TRPCReactProvider } from "@/lib/trpc/client";

const geistSans = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const nunitoFont = Nunito_Sans({
  variable: "--font-nunito",
  weight: "700",
  subsets: ["latin"],
});

const dotMatrix = localFont({
  src: "./fonts/dotmat.ttf",
  variable: "--font-dot",
});

export const metadata: Metadata = {
  title: {
    template: "%s · Objekt Tracker",
    default: "Objekt Tracker",
    absolute: "Objekt Tracker",
  },
  description: "Cosmo objekt explorer",
  // keywords taken from teamreflex/cosmo-web
  keywords: [
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
      className={`${geistSans.variable} ${geistMono.variable} ${dotMatrix.variable} ${nunitoFont.variable}`}
    >
      <body
        className={cn(
          "min-h-svh antialiased",
          process.env.NODE_ENV === "development" ? "debug-screens" : ""
        )}
      >
        <TRPCReactProvider>
          <ClientProviders>
            <Navbar />
            <main className="mx-auto w-full">{children}</main>
            <Analytics />
          </ClientProviders>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
