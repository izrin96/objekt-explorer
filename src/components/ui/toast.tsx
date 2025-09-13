"use client";

import { Toaster as ToasterPrimitive, type ToasterProps } from "sonner";
import { useTheme } from "@/components/theme-provider";

const Toast = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  return (
    <ToasterPrimitive
      theme={theme === "matsu" ? "light" : (theme as ToasterProps["theme"])}
      className="toaster group"
      richColors
      duration={2000}
      position="bottom-center"
      toastOptions={{
        className:
          "*:data-icon:self-start font-sans has-data-description:*:data-icon:mt-1 *:data-icon:mt-0.5 backdrop-blur-2xl",
      }}
      {...props}
    />
  );
};

export type { ToasterProps };
export { Toast };
