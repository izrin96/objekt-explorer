"use client";

import ObjektDetail from "@/components/objekt/objekt-detail";
import { Modal } from "@/components/ui";
import { ValidObjekt } from "@/lib/universal/objekts";
import { createContext, useCallback, useContext, useState } from "react";
import { useObjektTab } from "./use-objekt-tab";

type ContextProps = {
  currentSerial?: number;
  openObjekts: () => void;
  openTrades: (serial: number) => void;
};

const ObjektModalContext = createContext<ContextProps>({} as ContextProps);

type ProviderProps = {
  isProfile?: boolean;
  objekts: ValidObjekt[];
  children: ({ openObjekts }: { openObjekts: () => void }) => React.ReactNode;
};

export function ObjektModalProvider({
  children,
  isProfile,
  objekts,
}: ProviderProps) {
  const [open, setOpen] = useState(false);
  const [currentSerial, setCurrentSerial] = useState<number | undefined>();
  const setCurrentTab = useObjektTab((a) => a.setCurrentTab);

  const openObjekts = useCallback(() => {
    const [objekt] = objekts;
    setCurrentSerial("serial" in objekt ? objekt.serial : undefined);
    setOpen(true);
  }, [objekts]);

  const openTrades = useCallback(
    (serial: number) => {
      setCurrentSerial(serial);
      setCurrentTab("trades");
    },
    [setCurrentTab]
  );

  return (
    <ObjektModalContext
      value={{
        currentSerial,
        openObjekts,
        openTrades,
      }}
    >
      <Modal.Content isOpen={open} onOpenChange={setOpen} size="5xl">
        <Modal.Header className="hidden">
          <Modal.Title>Objekt display</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0 sm:p-0">
          {objekts.length > 0 && (
            <ObjektDetail objekts={objekts} isProfile={isProfile} />
          )}
        </Modal.Body>
      </Modal.Content>
      {children({ openObjekts })}
    </ObjektModalContext>
  );
}

export function useObjektModal() {
  return useContext(ObjektModalContext);
}
