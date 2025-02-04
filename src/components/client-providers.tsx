"use client";

import { useRouter } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PropsWithChildren } from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import NextTopLoader from "nextjs-toploader";
import { RouterProvider } from "react-aria-components";
import { ThemeProvider } from "@/components/theme-provider";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

declare module "react-aria-components" {
  interface RouterConfig {
    routerOptions: NonNullable<
      Parameters<ReturnType<typeof useRouter>["push"]>[1]
    >;
  }
}

export default function ClientProviders({ children }: PropsWithChildren) {
  const queryClient = new QueryClient();
  const router = useRouter();

  return (
    <RouterProvider navigate={router.push}>
      <ThemeProvider attribute="class">
        <NextTopLoader color="var(--primary)" height={2} showSpinner={false} />
        <NuqsAdapter>
          <QueryClientProvider client={queryClient}>
            {children}
            <ReactQueryDevtools />
          </QueryClientProvider>
        </NuqsAdapter>
      </ThemeProvider>
    </RouterProvider>
  );
}
