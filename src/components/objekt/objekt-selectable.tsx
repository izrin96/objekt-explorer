"use client";

import { useObjektSelect } from "@/hooks/use-objekt-select";
import { ValidObjekt } from "@/lib/universal/objekts";
import ObjektView from "./objekt-view";

export function ObjektViewSelectable({
  objekts,
  priority,
  getId,
  open,
  enableSelect,
}: {
  objekts: ValidObjekt[];
  priority: boolean;
  getId: () => string | number;
  open: () => void;
  enableSelect: boolean;
}) {
  const mode = useObjektSelect((a) => a.mode);
  const select = useObjektSelect((a) => a.select);
  const isSelected = useObjektSelect((state) => state.isSelected(getId()));
  return (
    <ObjektView
      objekts={objekts}
      priority={priority}
      isSelected={isSelected}
      open={() => {
        if (mode && enableSelect) {
          select(getId());
        } else {
          open();
        }
      }}
      select={enableSelect ? () => select(getId()) : undefined}
    />
  );
}
