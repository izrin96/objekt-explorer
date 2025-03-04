import type { Metadata } from "next";
import localFont from "next/font/local";
import { Geist, Geist_Mono } from "next/font/google";
import { Toast } from "@/components/ui";
import ClientProviders from "@/components/client-providers";
import "./globals.css";
import Navbar from "@/components/navbar";
import { Analytics } from "@/components/analytics";
import { PropsWithChildren } from "react";

const geistSans = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const dotMatrix = localFont({
  src: "./fonts/dot_matrix.woff2",
  variable: "--font-dotmatrix",
  weight: "400",
});

export const metadata: Metadata = {
  title: {
    template: "%s · Lunar",
    default: "Lunar",
    absolute: "Lunar",
  },
  description: "Cosmo objekt explorer",
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${dotMatrix.variable}`}
    >
      <body className="min-h-svh antialiased">
        <Toast />
        <ClientProviders>
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
