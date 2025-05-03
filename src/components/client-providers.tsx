"use client";

import { useRouter } from "next/navigation";
import { PropsWithChildren } from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { RouterProvider } from "react-aria-components";
import { ThemeProvider } from "@/components/theme-provider";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { BreakpointColumnProvider } from "@/hooks/use-breakpoint-column";

declare module "react-aria-components" {
  interface RouterConfig {
    routerOptions: NonNullable<
      Parameters<ReturnType<typeof useRouter>["push"]>[1]
    >;
  }
}

export default function ClientProviders({ children }: PropsWithChildren) {
  const router = useRouter();

  return (
    <RouterProvider navigate={router.push}>
      <ThemeProvider attribute="class" themes={["light", "dark", "matsu"]}>
        <NuqsAdapter>
          <BreakpointColumnProvider>{children}</BreakpointColumnProvider>
          <ReactQueryDevtools />
        </NuqsAdapter>
      </ThemeProvider>
    </RouterProvider>
  );
}
