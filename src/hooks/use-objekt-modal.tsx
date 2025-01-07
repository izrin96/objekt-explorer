"use client";

import ObjektDetail from "@/components/objekt/objekt-detail";
import { Modal } from "@/components/ui";
import { ValidObjekt } from "@/lib/universal/objekts";
import { ReactNode, createContext, useContext, useState } from "react";

type ContextProps = {
  currentTab?: string;
  setCurrentTab: (val: string) => void;
  openObjekts: (val: ValidObjekt[]) => void;
};

const ObjektModalContext = createContext<ContextProps>({} as ContextProps);

type ProviderProps = {
  children: ReactNode;
  initialTab?: string;
  isOwned?: boolean;
};

export function ObjektModalProvider({
  children,
  initialTab,
  isOwned = false,
}: ProviderProps) {
  const [currentTab, setCurrentTab] = useState(initialTab);
  const [open, setOpen] = useState(false);
  const [objekts, setObjekts] = useState<ValidObjekt[]>([]);
  function openObjekts(val: ValidObjekt[]) {
    setObjekts(val);
    setOpen(true);
  }
  return (
    <ObjektModalContext
      value={{
        currentTab,
        setCurrentTab,
        openObjekts,
      }}
    >
      <Modal.Content isOpen={open} onOpenChange={setOpen} size="5xl">
        <Modal.Header className="hidden">
          <Modal.Title>Objekt display</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0 sm:p-0 overflow-y-auto sm:overflow-y-hidden">
          {objekts.length > 0 && (
            <ObjektDetail isOwned={isOwned} objekts={objekts} />
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
