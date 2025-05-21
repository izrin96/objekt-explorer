"use client";

import { useObjektSelect } from "@/hooks/use-objekt-select";
import { Button } from "../ui";
import { useCallback, ReactNode } from "react";
import { toast } from "sonner";

export function SelectMode({
  children,
}: {
  children?: ({
    handleAction,
  }: {
    handleAction: (open: () => void) => void;
  }) => ReactNode;
}) {
  const mode = useObjektSelect((a) => a.mode);
  const toggleMode = useObjektSelect((a) => a.toggleMode);
  const reset = useObjektSelect((a) => a.reset);
  const selected = useObjektSelect((a) => a.selected);

  const handleAction = useCallback(
    (open: () => void) => {
      if (selected.length < 1) {
        toast.error("Must select at least one objekt", {
          duration: 1300,
        });
      } else {
        open();
      }
    },
    [selected]
  );

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <Button
        className={mode ? "!inset-ring-primary" : ""}
        intent="outline"
        onClick={toggleMode}
      >
        Select mode
      </Button>
      {mode && (
        <Button intent="outline" onClick={reset}>
          Reset
        </Button>
      )}
      {children?.({ handleAction })}
    </div>
  );
}
