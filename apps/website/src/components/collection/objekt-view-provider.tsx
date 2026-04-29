import type { PropsWithChildren } from "react";

import { ObjektColumnProvider } from "@/hooks/use-objekt-column";
import { ObjektModalProvider } from "@/hooks/use-objekt-modal";
import { ObjektSelectProvider } from "@/hooks/use-objekt-select";

interface ObjektViewProviderProps extends PropsWithChildren {
  initialColumn?: number;
  modalTab: "owned" | "trades";
}

export function ObjektViewProvider({ initialColumn, modalTab, children }: ObjektViewProviderProps) {
  return (
    <ObjektColumnProvider initialColumn={initialColumn}>
      <ObjektSelectProvider>
        <ObjektModalProvider initialTab={modalTab}>{children}</ObjektModalProvider>
      </ObjektSelectProvider>
    </ObjektColumnProvider>
  );
}
