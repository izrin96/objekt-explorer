import type React from "react";
import { createContext, use, useState } from "react";
import type { ValidObjekt } from "@/lib/universal/objekts";
import {
  ModalBody,
  ModalClose,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "../ui/modal";
import ObjektDetail from "./objekt-detail";

type Props = {
  showOwned?: boolean;
  objekts: ValidObjekt[];
  children: React.ReactNode;
  menu?: React.ReactNode;
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
        <ModalHeader className="hidden">
          <ModalTitle>Objekt display</ModalTitle>
        </ModalHeader>
        <ModalBody className="p-0 sm:p-0">
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
