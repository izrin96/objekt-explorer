import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import { type PropsWithChildren } from "react";
import { I18nProvider } from "react-aria-components/I18nProvider";
import { IntlayerProvider } from "react-intlayer";

import { ThemeProvider } from "./theme-provider";

export default function ClientProviders({
  children,
  locale,
}: PropsWithChildren<{ locale: string }>) {
  return (
    <ThemeProvider>
      <I18nProvider locale="en">
        <IntlayerProvider locale={locale}>
          <NuqsAdapter>{children}</NuqsAdapter>
        </IntlayerProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
