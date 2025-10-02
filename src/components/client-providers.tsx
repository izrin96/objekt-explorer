"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useRouter } from "next/navigation";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { type PropsWithChildren, useLayoutEffect, useState } from "react";
import { RouterProvider } from "react-aria-components";
import { ThemeProvider } from "@/components/theme-provider";
import { CosmoArtistProvider, type CosmoArtistProviderProps } from "@/hooks/use-cosmo-artist";
import { useThemeStyle } from "@/hooks/use-theme-style";
import { createQueryClient } from "@/lib/query/client";
import { Toast } from "./ui/toast";

declare module "react-aria-components" {
  interface RouterConfig {
    routerOptions: NonNullable<Parameters<ReturnType<typeof useRouter>["push"]>[1]>;
  }
}

export default function ClientProviders({ children }: PropsWithChildren) {
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
              {children}
              <ReactQueryDevtools />
            </NuqsAdapter>
          </ThemeStyleProvider>
        </ThemeProvider>
      </AppRouterProvider>
    </QueryClientProvider>
  );
}

export function ThemeStyleProvider({ children }: PropsWithChildren) {
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

export function ClientArtistProvider({
  children,
  ...props
}: PropsWithChildren<CosmoArtistProviderProps>) {
  return <CosmoArtistProvider {...props}>{children}</CosmoArtistProvider>;
}

function AppRouterProvider({ children }: PropsWithChildren) {
  const router = useRouter();
  return <RouterProvider navigate={router.push}>{children}</RouterProvider>;
}
