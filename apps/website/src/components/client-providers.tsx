import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import { type PropsWithChildren, useState } from "react";
import { I18nProvider } from "react-aria-components/I18nProvider";
import { preconnect } from "react-dom";
import { IntlayerProvider } from "react-intlayer";

import { ThemeProvider } from "@/components/theme-provider";
import { createQueryClient } from "@/lib/query/client";

import { Toast } from "./intentui/toast-custom";

export default function ClientProviders({
  children,
  locale,
}: PropsWithChildren<{ locale: string }>) {
  preconnect("https://imagedelivery.net", { crossOrigin: "" });
  preconnect("https://resources.cosmo.fans", { crossOrigin: "" });
  preconnect("https://static.cosmo.fans", { crossOrigin: "" });

  const [queryClient] = useState(() => createQueryClient());

  return (
    <I18nProvider locale={locale}>
      <IntlayerProvider locale={locale}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <NuqsAdapter>
              <Toast />
              {children}
              <ReactQueryDevtools />
            </NuqsAdapter>
          </ThemeProvider>
        </QueryClientProvider>
      </IntlayerProvider>
    </I18nProvider>
  );
}
