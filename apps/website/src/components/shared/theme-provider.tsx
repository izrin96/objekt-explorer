import { useEffect } from "react";
import { ThemeProvider as AppThemesProvider, useTheme as useAppTheme } from "tanstack-theme-kit";

import { THEME_COLORS } from "@/lib/utils";

function ThemeWatcher() {
  const { theme, systemTheme } = useAppTheme();
  const resolvedTheme = theme === "system" ? systemTheme : theme;

  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute(
        "content",
        resolvedTheme === "dark" ? THEME_COLORS.dark : THEME_COLORS.light,
      );
    }
  }, [resolvedTheme]);

  return null;
}

const ThemeProvider = ({ children, ...props }: React.ComponentProps<typeof AppThemesProvider>) => {
  return (
    <AppThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      enableColorScheme
      {...props}
    >
      <ThemeWatcher />
      {children}
    </AppThemesProvider>
  );
};

const useTheme = () => {
  const { theme, setTheme, systemTheme } = useAppTheme();
  const resolvedTheme = theme === "system" ? systemTheme : theme;
  return { theme, setTheme, systemTheme, resolvedTheme };
};

export { useTheme, ThemeProvider };
