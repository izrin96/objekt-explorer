"use client";

import { useObjektSelect } from "@/hooks/use-objekt-select";
import { Button } from "../ui";
import { useCallback } from "react";
import { toast } from "sonner";
import { AddToList, RemoveFromList } from "../list/modal/manage-objekt";

export function SelectMode({
  slug,
  state,
}: {
  slug?: string;
  state: "add" | "remove";
}) {
  const mode = useObjektSelect((a) => a.mode);
  const toggleMode = useObjektSelect((a) => a.toggleMode);
  const reset = useObjektSelect((a) => a.reset);
  const selected = useObjektSelect((a) => a.selected);

  const handleAction = useCallback(
    (open: () => void) => {
      if (selected.length < 1) {
        toast.error("Must select at least one objekt", {
          position: "top-center",
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

      {state === "add" && <AddToList onClick={(open) => handleAction(open)} />}
      {state === "remove" && slug && (
        <RemoveFromList slug={slug} onClick={(open) => handleAction(open)} />
      )}
    </div>
  );
}
