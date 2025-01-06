"use client";

import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
  useTheme,
} from "next-themes";

const ThemeProvider = ({ children, ...props }: ThemeProviderProps) => {
  return (
    <NextThemesProvider
      disableTransitionOnChange
      enableSystem
      storageKey="justd-theme"
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
};

export { ThemeProvider, useTheme };
