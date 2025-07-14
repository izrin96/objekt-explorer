"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useRouter } from "next/navigation";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { type PropsWithChildren, useState } from "react";
import { RouterProvider } from "react-aria-components";
import { preconnect, prefetchDNS } from "react-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { CosmoArtistProvider } from "@/hooks/use-cosmo-artist";
import { createQueryClient } from "@/lib/query/client";
import type { CosmoArtistWithMembersBFF } from "@/lib/universal/cosmo/artists";
import type { ValidArtist } from "@/lib/universal/cosmo/common";
import { Toast } from "./ui";

declare module "react-aria-components" {
  interface RouterConfig {
    routerOptions: NonNullable<Parameters<ReturnType<typeof useRouter>["push"]>[1]>;
  }
}

type Props = {
  artists: CosmoArtistWithMembersBFF[];
  selectedArtists: ValidArtist[];
};

export default function ClientProviders({
  children,
  artists,
  selectedArtists,
}: PropsWithChildren<Props>) {
  const [queryClient] = useState(() => createQueryClient());
  const router = useRouter();

  preconnect("https://imagedelivery.net");
  prefetchDNS("https://imagedelivery.net");
  preconnect("https://cdn.discordapp.com");
  prefetchDNS("https://cdn.discordapp.com");
  preconnect("https://umami.objekt.top");
  prefetchDNS("https://umami.objekt.top");

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider navigate={router.push}>
        <ThemeProvider
          enableSystem
          attribute="class"
          defaultTheme="system"
          themes={["light", "dark", "matsu"]}
        >
          <Toast />
          <div className="texture"></div>
          <NuqsAdapter>
            <CosmoArtistProvider artists={artists} selectedArtistIds={selectedArtists}>
              {children}
            </CosmoArtistProvider>
            <ReactQueryDevtools />
          </NuqsAdapter>
        </ThemeProvider>
      </RouterProvider>
    </QueryClientProvider>
  );
}
