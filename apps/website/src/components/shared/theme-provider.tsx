import { ThemeProvider as AppThemesProvider, useTheme } from "tanstack-theme-kit";

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
      {children}
    </AppThemesProvider>
  );
};

export { useTheme, ThemeProvider };
