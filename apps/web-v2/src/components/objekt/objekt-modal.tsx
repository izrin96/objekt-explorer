import type React from "react";
import { createContext, use, useState } from "react";
import type { ValidObjekt } from "@/lib/universal/objekts";
import { ModalClose, ModalContent, ModalFooter } from "../ui/modal";
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
      <ModalContent isOpen={open} onOpenChange={setOpen} size="5xl" className="overflow-y-auto">
        {menu}
        <ObjektDetail objekts={objekts} showOwned={showOwned} />
        <ModalFooter className="sm:hidden">
          <ModalClose>Close</ModalClose>
        </ModalFooter>
      </ModalContent>
      {children}
    </ObjektModalContext>
  );
}
