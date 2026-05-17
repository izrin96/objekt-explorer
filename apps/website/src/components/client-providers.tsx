import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import { type PropsWithChildren } from "react";
import { I18nProvider } from "react-aria-components/I18nProvider";

import { ThemeProvider } from "./theme-provider";

export default function ClientProviders({ children }: PropsWithChildren) {
  return (
    <ThemeProvider>
      <I18nProvider locale="en">
        <NuqsAdapter>{children}</NuqsAdapter>
      </I18nProvider>
    </ThemeProvider>
  );
}
