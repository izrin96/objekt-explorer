"use client";

import { Toaster as ToasterPrimitive, type ToasterProps } from "sonner";
import { useTheme } from "@/components/theme-provider";

const Toast = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  return (
    <ToasterPrimitive
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      richColors
      duration={2000}
      position="bottom-center"
      toastOptions={{
        className:
          "*:data-icon:self-start font-sans has-data-description:*:data-icon:mt-1 *:data-icon:mt-0.5 backdrop-blur-2xl",
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
};

export type { ToasterProps };
export { Toast };
