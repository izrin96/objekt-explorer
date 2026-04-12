"use client";

import { HeartBreakIcon } from "@phosphor-icons/react/dist/ssr";

import "./globals.css";
import { Google_Sans_Flex } from "next/font/google";

import { Button } from "@/components/intentui/button";
import { cn, SITE_NAME } from "@/lib/utils";

const googleSansFlex = Google_Sans_Flex({
  subsets: ["latin"],
  weight: "variable",
  variable: "--font-google-sans-flex",
  fallback: [],
});

export default function GlobalError() {
  return (
    <html lang="en" className={cn("dark", googleSansFlex.variable)}>
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
