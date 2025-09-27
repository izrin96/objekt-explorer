"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useRouter } from "next/navigation";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { type PropsWithChildren, useLayoutEffect, useState } from "react";
import { RouterProvider } from "react-aria-components";
import { ThemeProvider } from "@/components/theme-provider";
import { CosmoArtistProvider } from "@/hooks/use-cosmo-artist";
import { useThemeStyle } from "@/hooks/use-theme-style";
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
    <QueryClientProvider client={queryClient}>
      <AppRouterProvider>
        <ThemeProvider
          enableSystem
          attribute="class"
          defaultTheme="system"
          themes={["light", "dark"]}
        >
          <ThemeStyleProvider>
            <Toast />
            <div className="texture"></div>
            <NuqsAdapter>
              <CosmoArtistProvider {...props}>{children}</CosmoArtistProvider>
              <ReactQueryDevtools />
            </NuqsAdapter>
          </ThemeStyleProvider>
        </ThemeProvider>
      </AppRouterProvider>
    </QueryClientProvider>
  );
}

export function ThemeStyleProvider({ children }: { children: React.ReactNode }) {
  const { themeStyle } = useThemeStyle();
  const [mounted, setMounted] = useState(false);

  useLayoutEffect(() => {
    if (document.documentElement.getAttribute("data-theme") !== themeStyle) {
      document.documentElement.setAttribute("data-theme", themeStyle);
    }
    setMounted(true);
  }, [themeStyle]);

  if (!mounted) {
    return null;
  }

  return children;
}

function AppRouterProvider({ children }: PropsWithChildren) {
  const router = useRouter();
  return <RouterProvider navigate={router.push}>{children}</RouterProvider>;
}
