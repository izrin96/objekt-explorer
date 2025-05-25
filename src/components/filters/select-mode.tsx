"use client";

import { useObjektSelect } from "@/hooks/use-objekt-select";
import { Button, Tooltip } from "../ui";
import { useCallback, ReactNode } from "react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "motion/react";
import React from "react";
import {
  CheckCircleIcon,
  ChecksIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";

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
        <ChecksIcon weight="regular" data-slot="icon" />
        Select mode
      </Button>
      <Button intent="outline" onClick={reset}>
        <XIcon weight="regular" data-slot="icon" />
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
          className="fixed inset-x-0 bottom-2 w-fit mx-auto z-10 bg-bg/80 backdrop-blur px-3 py-2 rounded shadow border"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
        >
          <div className="flex gap-2 items-center flex-wrap justify-center">
            <Tooltip delay={0} closeDelay={0}>
              <Button intent="outline" onClick={reset}>
                <XIcon size={18} weight="regular" />
              </Button>
              <Tooltip.Content>Clear selection</Tooltip.Content>
            </Tooltip>
            <Tooltip delay={0} closeDelay={0}>
              <Button intent="outline" onClick={toggleMode}>
                <CheckCircleIcon size={18} weight={mode ? "fill" : "regular"} />
              </Button>
              <Tooltip.Content>Toggle select mode</Tooltip.Content>
            </Tooltip>
            {children?.({ handleAction })}
            <span className="font-semibold text-sm py-2 px-1">
              {selected.length} selected
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
