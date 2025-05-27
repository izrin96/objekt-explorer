"use client";

import React, { useState } from "react";
import { Modal } from "../ui";
import ObjektDetail from "./objekt-detail";
import { ValidObjekt } from "@/lib/universal/objekts";

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
  return (
    <>
      <Modal.Content isOpen={open} onOpenChange={setOpen} size="5xl">
        <Modal.Header className="hidden">
          <Modal.Title>Objekt display</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0 sm:p-0">
          {menu}
          <ObjektDetail objekts={objekts} isProfile={isProfile} />
        </Modal.Body>
      </Modal.Content>
      {children({ openObjekts: () => setOpen(true) })}
    </>
  );
}
