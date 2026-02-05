"use client";

import { HeartBreakIcon } from "@phosphor-icons/react/dist/ssr";

import "./globals.css";
import { Google_Sans_Flex } from "next/font/google";

import { Button } from "@/components/ui/button";
import { SITE_NAME } from "@/lib/utils";

const inter = Google_Sans_Flex({
  variable: "--font-inter",
  display: "swap",
  subsets: ["latin"],
  weight: "variable",
  adjustFontFallback: false,
  fallback: [],
});

export default function GlobalError() {
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <head>
        <title>{SITE_NAME}</title>
      </head>

      <body className="min-h-svh antialiased">
        <div className="flex h-svh w-full flex-col items-center justify-center gap-3">
          <HeartBreakIcon size={64} weight="light" />
          <h2 className="text-lg">Something went wrong!</h2>
          <Button intent="outline" onPress={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </body>
    </html>
  );
}
