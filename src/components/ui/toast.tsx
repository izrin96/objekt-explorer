"use client"

import { useTheme } from "@/components/theme-provider"
import { Toaster as ToasterPrimitive, type ToasterProps } from "sonner"

const Toast = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()
  return (
    <ToasterPrimitive
      theme={theme === "matsu" ? "light" : theme as ToasterProps["theme"]}
      className="toaster group"
      richColors
      duration={2000}
      position="bottom-center"
      toastOptions={{
        classNames: {
          toast: "toast border-0! inset-ring! inset-ring-fg/10!",
          title: "title",
          description: "description",
          actionButton: "bg-primary! hover:bg-primary/90! text-primary-fg!",
          cancelButton: "bg-transparent! hover:bg-secondary! hover:text-secondary-fg!",
          closeButton: "close-button",
        },
      }}
      {...props}
    />
  )
}

export type { ToasterProps }
export { Toast }
