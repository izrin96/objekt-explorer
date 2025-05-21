"use client";

import React, { useCallback, useState } from "react";
import { Modal } from "../ui";
import ObjektDetail from "./objekt-detail";
import { ValidObjekt } from "@/lib/universal/objekts";
import { useObjektModal } from "@/hooks/use-objekt-modal";

type Props = {
  isProfile?: boolean;
  objekts: ValidObjekt[];
  children: ({ openObjekts }: { openObjekts: () => void }) => React.ReactNode;
  menu?: React.ReactNode;
};

export default function ObjektModal({
  children,
  isProfile,
  objekts,
  menu,
}: Props) {
  const [open, setOpen] = useState(false);
  const setCurrentSerial = useObjektModal((a) => a.setCurrentSerial);

  const openObjekts = useCallback(() => {
    const [objekt] = objekts;
    setCurrentSerial("serial" in objekt ? objekt.serial : undefined);
    setOpen(true);
  }, [objekts, setCurrentSerial]);

  return (
    <>
      <Modal.Content isOpen={open} onOpenChange={setOpen} size="5xl">
        <Modal.Header className="hidden">
          <Modal.Title>Objekt display</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0 sm:p-0">
          {menu}
          {objekts.length > 0 && (
            <ObjektDetail objekts={objekts} isProfile={isProfile} />
          )}
        </Modal.Body>
      </Modal.Content>
      {children({ openObjekts })}
    </>
  );
}
