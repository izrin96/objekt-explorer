import type { ValidObjekt } from "@repo/lib/types/objekt";
import { createContext, type ReactNode, use, useState } from "react";

import { useIsMobile } from "@/hooks/use-mobile";

import { ModalBody, ModalContent, ModalHeader } from "../intentui/modal";
import { SheetBody, SheetContent, SheetHeader } from "../intentui/sheet";
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
  const isMobile = useIsMobile();
  const handleClick = () => setOpen(true);

  const body = (
    <>
      {menu}
      <ObjektDetail objekts={objekts} />
    </>
  );

  return (
    <ObjektModalContext value={{ handleClick }}>
      {isMobile ? (
        <SheetContent
          isOpen={open}
          onOpenChange={setOpen}
          side="right"
          isFloat={false}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="sm:max-w-120"
        >
          <SheetHeader className="hidden">Objekt detail</SheetHeader>
          <SheetBody className="overflow-x-hidden overflow-y-auto pt-12 pb-72 [--gutter:0]">
            {body}
          </SheetBody>
        </SheetContent>
      ) : (
        <ModalContent
          isOpen={open}
          onOpenChange={setOpen}
          size="5xl"
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <ModalHeader className="hidden">Objekt detail</ModalHeader>
          <ModalBody className="py-0 [--gutter:0]">{body}</ModalBody>
        </ModalContent>
      )}
      {children}
    </ObjektModalContext>
  );
}
