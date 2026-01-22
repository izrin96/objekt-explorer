"use client";

import { HeartBreakIcon } from "@phosphor-icons/react/dist/ssr";

import "./globals.css";
import { Inter } from "next/font/google";

import { Button } from "@/components/ui/button";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export default function GlobalError() {
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <head>
        <title>Objekt Tracker</title>
      </head>

      <body className="min-h-svh antialiased">
        <div className="flex h-svh w-full flex-col items-center justify-center gap-3">
          <HeartBreakIcon size={64} weight="light" />
          <h2 className="text-lg">Something went wrong!</h2>
          <Button intent="outline" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </body>
    </html>
  );
}
