"use client";

import type { ValidObjekt } from "@repo/lib/types/objekt";

import { useObjektSelect } from "@/hooks/use-objekt-select";

import { ObjektModalContext, useObjektModal } from "./objekt-modal";

export function ObjektViewSelectable({
  objekts,
  children,
}: {
  objekts: ValidObjekt[];
  children: ({ isSelected }: { isSelected: boolean }) => React.ReactNode;
}) {
  const [objekt] = objekts as [ValidObjekt];
  const handleSelect = useObjektSelect((a) => a.handleSelect);
  const isSelected = useObjektSelect((state) => state.isSelected(objekt));
  const ctx = useObjektModal();

  const handleClick = () => handleSelect(objekts, ctx.handleClick);

  return (
    <ObjektModalContext value={{ handleClick }}>
      {children({
        isSelected,
      })}
    </ObjektModalContext>
  );
}
