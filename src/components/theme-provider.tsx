"use client";

import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";

const ThemeProvider = ({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) => {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
};

export { useTheme, ThemeProvider };
