"use client";

import type { ValidObjekt } from "@/lib/universal/objekts";

import { useObjektSelect } from "@/hooks/use-objekt-select";

import { ObjektModalContext, useObjektModal } from "./objekt-modal";

export function ObjektViewSelectable({
  objekt,
  children,
}: {
  objekt: ValidObjekt;
  children: ({ isSelected }: { isSelected: boolean }) => React.ReactNode;
}) {
  const handleSelect = useObjektSelect((a) => a.handleSelect);
  const isSelected = useObjektSelect((state) => state.isSelected(objekt));
  const ctx = useObjektModal();

  const handleClick = () => handleSelect(objekt, ctx.handleClick);

  return (
    <ObjektModalContext value={{ handleClick }}>
      {children({
        isSelected,
      })}
    </ObjektModalContext>
  );
}
