"use client";

import { useObjektSelect } from "@/hooks/use-objekt-select";
import type { ValidObjekt } from "@/lib/universal/objekts";

export function ObjektViewSelectable({
  objekt,
  openObjekts,
  children,
}: {
  objekt: ValidObjekt;
  openObjekts: () => void;
  children: ({ isSelected, open }: { isSelected: boolean; open: () => void }) => React.ReactNode;
}) {
  const mode = useObjektSelect((a) => a.mode);
  const objektSelect = useObjektSelect((a) => a.select);
  const isSelected = useObjektSelect((state) => state.isSelected(objekt));

  return children({
    isSelected,
    open: () => {
      if (mode) {
        objektSelect(objekt);
      } else {
        openObjekts();
      }
    },
  });
}
