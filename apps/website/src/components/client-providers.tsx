import type { NavigateOptions, ToOptions } from "@tanstack/react-router";
import { useRouter } from "@tanstack/react-router";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import { type PropsWithChildren } from "react";
import { RouterProvider } from "react-aria-components";
import { preconnect } from "react-dom";

import { ThemeProvider } from "@/components/theme-provider";
import { CosmoArtistProvider } from "@/hooks/use-cosmo-artist";
import { FilterDataProvider } from "@/hooks/use-filter-data";
import { artists } from "@/lib/server/cosmo/artists";

import { Toast } from "./ui/toast-custom";

declare module "react-aria-components" {
  interface RouterConfig {
    href: ToOptions["to"];
    routerOptions: Omit<NavigateOptions, keyof ToOptions>;
  }
}

export default function ClientProviders({ children }: PropsWithChildren) {
  preconnect("https://imagedelivery.net", { crossOrigin: "" });
  preconnect("https://resources.cosmo.fans", { crossOrigin: "" });
  preconnect("https://static.cosmo.fans", { crossOrigin: "" });

  const router = useRouter();
  return (
    <ThemeProvider>
      <RouterProvider navigate={(to, options) => router.navigate({ to, ...options })}>
        <NuqsAdapter>
          <CosmoArtistProvider artists={artists}>
            <FilterDataProvider>
              <div id="hello">{children}</div>
            </FilterDataProvider>
          </CosmoArtistProvider>
          <Toast />
        </NuqsAdapter>
      </RouterProvider>
    </ThemeProvider>
  );
}
