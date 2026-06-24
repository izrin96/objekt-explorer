import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useLocation } from "@tanstack/react-router";
import { createContext, type ReactNode, use, useEffect, useState } from "react";

import { m } from "@/paraglide/messages";

import { ModalBody, ModalClose, ModalContent, ModalFooter, ModalHeader } from "../intentui/modal";
import ObjektDetail from "./objekt-detail";

type Props = {
  objekts: ValidObjekt[];
  children: ReactNode;
  menu?: ReactNode;
};

export const ObjektModalContext = createContext({
  handleClick: () => {},
});

export const useObjektModal = () => use(ObjektModalContext);

export default function ObjektModal({ children, objekts, menu }: Props) {
  const [open, setOpen] = useState(false);
  const handleClick = () => setOpen(true);
  const pathname = useLocation({ select: (s) => s.pathname });

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <ObjektModalContext value={{ handleClick }}>
      <ModalContent isOpen={open} onOpenChange={setOpen} size="5xl">
        <ModalHeader className="hidden">Objekt detail</ModalHeader>
        <ModalBody className="py-0 [--gutter:0]">
          {menu}
          <ObjektDetail objekts={objekts} />
        </ModalBody>
        <ModalFooter className="sm:hidden">
          <ModalClose>{m.common_modal_close()}</ModalClose>
        </ModalFooter>
      </ModalContent>
      {children}
    </ObjektModalContext>
  );
}
