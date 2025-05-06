"use client";

import { useObjektSelect } from "@/hooks/use-objekt-select";

export function ObjektViewSelectable({
  getId,
  openObjekts,
  enableSelect,
  children,
}: {
  getId: () => string | number;
  openObjekts: () => void;
  enableSelect: boolean;
  children: ({
    isSelected,
    open,
  }: {
    isSelected: boolean;
    open: () => void;
    select: (() => void) | undefined;
  }) => React.ReactNode;
}) {
  const mode = useObjektSelect((a) => a.mode);
  const objektSelect = useObjektSelect((a) => a.select);
  const isSelected = useObjektSelect((state) => state.isSelected(getId()));

  return children({
    isSelected,
    open: () => {
      if (mode && enableSelect) {
        objektSelect(getId());
      } else {
        openObjekts();
      }
    },
    select: enableSelect ? () => objektSelect(getId()) : undefined,
  });
}
