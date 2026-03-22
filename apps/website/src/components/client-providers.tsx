import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import type { NavigateOptions, ToOptions } from "@tanstack/react-router";
import { useRouter } from "@tanstack/react-router";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import { type PropsWithChildren, useState } from "react";
import { RouterProvider } from "react-aria-components";
import { preconnect } from "react-dom";

import { ThemeProvider } from "@/components/theme-provider";
import { createQueryClient } from "@/lib/query/client";

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
  const [queryClient] = useState(() => createQueryClient());

  return (
    <RouterProvider navigate={(to, options) => router.navigate({ to, ...options })}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <NuqsAdapter>
            <Toast />
            {children}
            <ReactQueryDevtools />
          </NuqsAdapter>
        </ThemeProvider>
      </QueryClientProvider>
    </RouterProvider>
  );
}
