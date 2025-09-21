"use client";

import { ProgressProvider, useRouter } from "@bprogress/next/app";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { type PropsWithChildren, useState } from "react";
import { RouterProvider } from "react-aria-components";
import { ThemeProvider } from "@/components/theme-provider";
import { CosmoArtistProvider } from "@/hooks/use-cosmo-artist";
import { createQueryClient } from "@/lib/query/client";
import type { CosmoArtistWithMembersBFF } from "@/lib/universal/cosmo/artists";
import type { ValidArtist } from "@/lib/universal/cosmo/common";
import type { ClassArtist, SeasonArtist } from "@/lib/universal/cosmo/filter-data";
import { Toast } from "./ui";

declare module "react-aria-components" {
  interface RouterConfig {
    routerOptions: NonNullable<Parameters<ReturnType<typeof useRouter>["push"]>[1]>;
  }
}

type Props = {
  artists: CosmoArtistWithMembersBFF[];
  selectedArtistIds: ValidArtist[];
  season: SeasonArtist[];
  classes: ClassArtist[];
};

export default function ClientProviders({ children, ...props }: PropsWithChildren<Props>) {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <ProgressProvider
      height="2px"
      color="var(--primary)"
      options={{ showSpinner: false }}
      shallowRouting
    >
      <QueryClientProvider client={queryClient}>
        <AppRouterProvider>
          <ThemeProvider
            enableSystem
            attribute="class"
            defaultTheme="system"
            themes={["light", "dark", "matsu"]}
          >
            <Toast />
            <div className="texture"></div>
            <NuqsAdapter>
              <CosmoArtistProvider {...props}>{children}</CosmoArtistProvider>
              <ReactQueryDevtools />
            </NuqsAdapter>
          </ThemeProvider>
        </AppRouterProvider>
      </QueryClientProvider>
    </ProgressProvider>
  );
}

function AppRouterProvider({ children }: PropsWithChildren) {
  const router = useRouter();
  return <RouterProvider navigate={router.push}>{children}</RouterProvider>;
}
