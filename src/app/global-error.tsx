"use client";

import { Button } from "@/components/ui";
import { HeartBreakIcon } from "@phosphor-icons/react/dist/ssr";
import { Geist } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export default function GlobalError() {
  return (
    <html className={`dark ${geistSans.variable}`}>
      <head>
        <title>Objekt Tracker</title>
      </head>

      <body className="min-h-svh antialiased">
        <div className="flex flex-col gap-3 items-center justify-center h-svh w-full">
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
