"use client";

import { useObjektSelect } from "@/hooks/use-objekt-select";
import { Button } from "../ui";
import { useCallback, ReactNode } from "react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "motion/react";
import React from "react";
import { HandPointingIcon, XIcon } from "@phosphor-icons/react/dist/ssr";

type Props = {
  children?: ({
    handleAction,
  }: {
    handleAction: (open: () => void) => void;
  }) => ReactNode;
};

export function SelectMode({ children }: Props) {
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
      <Button intent="outline" onClick={reset}>
        Clear
      </Button>
      {children?.({ handleAction })}
    </div>
  );
}

export function FloatingSelectMode({ children }: Props) {
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
    <AnimatePresence>
      {selected.length > 0 && (
        <motion.div
          className="fixed inset-x-0 bottom-2 w-fit mx-auto z-1 bg-bg/80 backdrop-blur px-3 py-2 rounded shadow border"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
        >
          <div className="flex gap-2 items-center flex-wrap justify-center">
            <Button intent="danger" onClick={reset}>
              <XIcon size={18} weight="bold" />
            </Button>
            <Button intent="outline" onClick={toggleMode}>
              <HandPointingIcon size={18} weight={mode ? "fill" : "regular"} />
            </Button>
            {children?.({ handleAction })}
            <span className="font-semibold text-sm py-2">
              {selected.length} selected
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
