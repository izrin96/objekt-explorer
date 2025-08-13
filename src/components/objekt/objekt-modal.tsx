"use client";

import type React from "react";
import { useState } from "react";
import type { ValidObjekt } from "@/lib/universal/objekts";
import { Modal } from "../ui";
import ObjektDetail from "./objekt-detail";

type Props = {
  showOwned?: boolean;
  objekts: ValidObjekt[];
  children: ({ openObjekts }: { openObjekts: () => void }) => React.ReactNode;
  menu?: React.ReactNode;
};

export default function ObjektModal({ children, showOwned, objekts, menu }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Modal.Content isOpen={open} onOpenChange={setOpen} size="5xl">
        <Modal.Header className="hidden">
          <Modal.Title>Objekt display</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0 sm:p-0">
          {menu}
          <ObjektDetail objekts={objekts} showOwned={showOwned} onClose={() => setOpen(false)} />
        </Modal.Body>
      </Modal.Content>
      {children({ openObjekts: () => setOpen(true) })}
    </>
  );
}
