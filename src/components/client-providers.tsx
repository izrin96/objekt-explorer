"use client";

import { useRouter } from "next/navigation";
import { PropsWithChildren } from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { RouterProvider } from "react-aria-components";
import { ThemeProvider } from "@/components/theme-provider";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toast } from "./ui";
import { CosmoArtistProvider } from "@/hooks/use-cosmo-artist";
import { artists } from "@/lib/server/cosmo/artists";
import { preconnect, prefetchDNS } from "react-dom";

declare module "react-aria-components" {
  interface RouterConfig {
    routerOptions: NonNullable<
      Parameters<ReturnType<typeof useRouter>["push"]>[1]
    >;
  }
}

export default function ClientProviders({ children }: PropsWithChildren) {
  const router = useRouter();

  preconnect("https://imagedelivery.net");
  prefetchDNS("https://imagedelivery.net");
  preconnect("https://cdn.discordapp.com");
  prefetchDNS("https://cdn.discordapp.com");
  preconnect("https://umami.objekt.top");
  prefetchDNS("https://umami.objekt.top");

  return (
    <RouterProvider navigate={router.push}>
      <ThemeProvider enableSystem attribute="class" defaultTheme="system" themes={["light", "dark", "matsu"]}>
        <Toast />
        <div className="texture"></div>
        <NuqsAdapter>
          <CosmoArtistProvider artists={artists}>
            {children}
          </CosmoArtistProvider>
          <ReactQueryDevtools />
        </NuqsAdapter>
      </ThemeProvider>
    </RouterProvider>
  );
}
