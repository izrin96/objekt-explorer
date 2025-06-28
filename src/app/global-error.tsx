"use client";

import { HeartBreakIcon } from "@phosphor-icons/react/dist/ssr";
import { Geist } from "next/font/google";
import { Button } from "@/components/ui";

const geistSans = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export default function GlobalError() {
  return (
    <html lang="en" className={`dark ${geistSans.variable}`}>
      <head>
        <title>Objekt Tracker</title>
      </head>

      <body className="min-h-svh antialiased">
        <div className="flex h-svh w-full flex-col items-center justify-center gap-3">
          <HeartBreakIcon size={64} weight="light" />
          <h2 className="text-lg">Something went wrong!</h2>
          <Button intent="secondary" onPress={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </body>
    </html>
  );
}
