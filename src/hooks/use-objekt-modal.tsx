"use client";

import ObjektDetail from "@/components/objekt/objekt-detail";
import { Modal } from "@/components/ui";
import { OwnedObjekt, ValidObjekt } from "@/lib/universal/objekts";
import { ReactNode, createContext, useContext, useState } from "react";

export type ValidTab = "owned" | "trades";

type ContextProps = {
  currentTab?: ValidTab;
  currentSerial?: number;
  setCurrentTab: (tab: ValidTab) => void;
  openObjekts: (objekt: ValidObjekt[]) => void;
  openTrades: (serial: number) => void;
};

const ObjektModalContext = createContext<ContextProps>({} as ContextProps);

type ProviderProps = {
  children: ReactNode;
  initialTab: ValidTab;
  isProfile?: boolean;
};

export function ObjektModalProvider({
  children,
  initialTab,
  isProfile,
}: ProviderProps) {
  const [currentTab, setCurrentTab] = useState<ValidTab>(initialTab);
  const [open, setOpen] = useState(false);
  const [objekts, setObjekts] = useState<ValidObjekt[]>([]);
  const [currentSerial, setCurrentSerial] = useState<number | undefined>();
  function openObjekts(objekts: ValidObjekt[]) {
    const [objekt] = objekts;
    setCurrentSerial("serial" in objekt ? objekt.serial : undefined);
    setObjekts(objekts);
    setOpen(true);
  }
  function openTrades(serial: number) {
    setCurrentSerial(serial);
    setCurrentTab("trades");
  }

  return (
    <ObjektModalContext
      value={{
        currentTab,
        currentSerial,
        setCurrentTab,
        openObjekts,
        openTrades,
      }}
    >
      <Modal.Content
        isOpen={open}
        onOpenChange={() => setOpen(false)}
        size="5xl"
      >
        <Modal.Header className="hidden">
          <Modal.Title>Objekt display</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0 sm:p-0 overflow-y-auto sm:overflow-y-hidden">
          {objekts.length > 0 && (
            <ObjektDetail objekts={objekts} isProfile={isProfile} />
          )}
        </Modal.Body>
      </Modal.Content>

      {children}
    </ObjektModalContext>
  );
}

export function useObjektModal() {
  const ctx = useContext(ObjektModalContext);
  return {
    ...ctx,
  };
}
