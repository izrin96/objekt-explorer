import { Toaster as ToasterPrimitive, type ToasterProps } from "sonner";
import { twJoin } from "tailwind-merge";

import { useTheme } from "../shared/theme-provider";

export function Toast(props: ToasterProps) {
  const { theme = "system" } = useTheme();
  return (
    <ToasterPrimitive
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      richColors
      duration={2500}
      position="bottom-right"
      toastOptions={{
        className: twJoin(
          "will-change-transform not-has-data-[slot=note]:backdrop-blur-3xl *:data-icon:mt-0.5 *:data-icon:self-start has-data-description:*:data-icon:mt-1 *:data-[slot=note]:relative *:data-[slot=note]:z-50",
          "**:data-action:[--normal-bg:var(--color-primary-fg)] **:data-action:[--normal-text:var(--color-primary)]",
        ),
      }}
      style={
        {
          "--normal-bg": "var(--color-overlay)",
          "--normal-text": "var(--color-overlay-fg)",
          "--normal-border": "var(--color-border)",

          "--success-bg": "var(--color-overlay)",
          "--success-text": "var(--color-overlay-fg)",
          "--success-border": "var(--color-border)",

          "--error-bg": "var(--color-overlay)",
          "--error-text": "var(--color-overlay-fg)",
          "--error-border": "var(--color-border)",

          "--warning-bg": "var(--color-overlay)",
          "--warning-text": "var(--color-overlay-fg)",
          "--warning-border": "var(--color-border)",

          "--info-bg": "var(--color-overlay)",
          "--info-text": "var(--color-overlay-fg)",
          "--info-border": "var(--color-border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
}
