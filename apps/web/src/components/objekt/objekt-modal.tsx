"use client";

import type { ValidObjekt } from "@repo/lib/types/objekt";

import { createContext, type ReactNode, use, useState } from "react";

import { ModalBody, ModalClose, ModalContent, ModalFooter } from "../ui/modal";
import ObjektDetail from "./objekt-detail";

type Props = {
  showOwned?: boolean;
  objekts: ValidObjekt[];
  children: ReactNode;
  menu?: ReactNode;
};

export const ObjektModalContext = createContext({
  handleClick: () => {},
});

export const useObjektModal = () => use(ObjektModalContext);

export default function ObjektModal({ children, showOwned, objekts, menu }: Props) {
  const [open, setOpen] = useState(false);

  const handleClick = () => setOpen(true);

  return (
    <ObjektModalContext value={{ handleClick }}>
      <ModalContent isOpen={open} onOpenChange={setOpen} size="5xl">
        <ModalBody className="py-0 [--gutter:0]">
          {menu}
          <ObjektDetail objekts={objekts} showOwned={showOwned} />
        </ModalBody>
        <ModalFooter className="sm:hidden">
          <ModalClose>Close</ModalClose>
        </ModalFooter>
      </ModalContent>
      {children}
    </ObjektModalContext>
  );
}
