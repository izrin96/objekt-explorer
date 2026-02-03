"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useRouter } from "next/navigation";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { type PropsWithChildren, useState } from "react";
import { I18nProvider, RouterProvider } from "react-aria-components";

import { ThemeProvider } from "@/components/theme-provider";
import { createQueryClient } from "@/lib/query/client";

import { Toast } from "./ui/toast-custom";

declare module "react-aria-components" {
  interface RouterConfig {
    routerOptions: NonNullable<Parameters<ReturnType<typeof useRouter>["push"]>[1]>;
  }
}

export default function ClientProviders({ children }: PropsWithChildren) {
  const router = useRouter();
  const [queryClient] = useState(() => createQueryClient());

  return (
    <I18nProvider locale="en">
      <RouterProvider navigate={router.push}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider
            enableSystem
            attribute="class"
            defaultTheme="system"
            themes={["light", "dark"]}
          >
            <NuqsAdapter>
              <Toast />
              {children}
              <ReactQueryDevtools />
            </NuqsAdapter>
          </ThemeProvider>
        </QueryClientProvider>
      </RouterProvider>
    </I18nProvider>
  );
}
