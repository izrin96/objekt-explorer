import type React from "react";

export function FormError({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="text-destructive-foreground text-xs text-pretty">
      {children}
    </p>
  );
}
