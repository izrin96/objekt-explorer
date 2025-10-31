"use client";

import { useTheme } from "next-themes";
import { Toaster as ToasterPrimitive, type ToasterProps } from "sonner";
import { twJoin } from "tailwind-merge";

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
          "not-has-data-[slot=note]:backdrop-blur-3xl *:data-icon:mt-0.5 *:data-icon:self-start has-data-description:*:data-icon:mt-1",
          "**:data-action:[--normal-bg:var(--primary-fg)] **:data-action:[--normal-text:var(--primary)]",
        ),
      }}
      style={
        {
          "--normal-bg": "var(--overlay)",
          "--normal-text": "var(--overlay-fg)",
          "--normal-border": "var(--border)",

          "--success-bg": "var(--overlay)",
          "--success-text": "var(--overlay-fg)",
          "--success-border": "var(--border)",

          "--error-bg": "var(--overlay)",
          "--error-text": "var(--overlay-fg)",
          "--error-border": "var(--border)",

          "--warning-bg": "var(--overlay)",
          "--warning-text": "var(--overlay-fg)",
          "--warning-border": "var(--border)",

          "--info-bg": "var(--overlay)",
          "--info-text": "var(--overlay-fg)",
          "--info-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
}
