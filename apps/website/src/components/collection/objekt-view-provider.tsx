import { createContext, type PropsWithChildren, use } from "react";

import { ObjektColumnProvider } from "@/hooks/use-objekt-column";
import { ObjektModalProvider } from "@/hooks/use-objekt-modal";
import { ObjektSelectProvider } from "@/hooks/use-objekt-select";

const ObjektShowOwnedContext = createContext(false);

export function useObjektShowOwned() {
  return use(ObjektShowOwnedContext);
}

interface ObjektViewProviderProps extends PropsWithChildren {
  initialColumn?: number;
  modalTab: "owned" | "trades";
}

export function ObjektViewProvider({ initialColumn, modalTab, children }: ObjektViewProviderProps) {
  return (
    <ObjektShowOwnedContext value={modalTab === "owned"}>
      <ObjektColumnProvider initialColumn={initialColumn}>
        <ObjektSelectProvider>
          <ObjektModalProvider initialTab={modalTab}>{children}</ObjektModalProvider>
        </ObjektSelectProvider>
      </ObjektColumnProvider>
    </ObjektShowOwnedContext>
  );
}
