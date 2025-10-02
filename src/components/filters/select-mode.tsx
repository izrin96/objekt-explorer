"use client";

import { ChecksIcon, HandPointingIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { type ReactNode, useCallback } from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import { useObjektSelect } from "@/hooks/use-objekt-select";
import type { ValidObjekt } from "@/lib/universal/objekts";
import { Button } from "../ui/button";
import { Toggle } from "../ui/toggle";
import { Tooltip, TooltipContent } from "../ui/tooltip";

type Props = {
  children?: ({ handleAction }: { handleAction: (open: () => void) => void }) => ReactNode;
  objekts: ValidObjekt[];
};

export function SelectMode({ children, objekts }: Props) {
  const t = useTranslations("filter");
  const mode = useObjektSelect((a) => a.mode);
  const batchSelect = useObjektSelect((a) => a.batchSelect);
  const toggleMode = useObjektSelect((a) => a.toggleMode);
  const reset = useObjektSelect((a) => a.reset);
  const selected = useObjektSelect(useShallow((a) => a.getSelected()));

  const handleAction = useCallback(
    (open: () => void) => {
      if (selected.length === 0) {
        toast.error("Must select at least one objekt");
      } else {
        open();
      }
    },
    [selected],
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Toggle
        isSelected={mode}
        className={mode ? "!inset-ring-primary" : ""}
        intent="outline"
        onClick={toggleMode}
      >
        <HandPointingIcon weight="regular" data-slot="icon" />
        {t("select_mode")}
      </Toggle>
      <Button intent="outline" onClick={() => batchSelect(objekts.toReversed())}>
        <ChecksIcon weight="regular" data-slot="icon" />
        Select all
      </Button>
      <Button intent="outline" onClick={reset}>
        <XIcon weight="regular" data-slot="icon" />
        Deselect
      </Button>
      {children?.({ handleAction })}
    </div>
  );
}

export function FloatingSelectMode({ children, objekts }: Props) {
  const mode = useObjektSelect((a) => a.mode);
  const batchSelect = useObjektSelect((a) => a.batchSelect);
  const toggleMode = useObjektSelect((a) => a.toggleMode);
  const reset = useObjektSelect((a) => a.reset);
  const selected = useObjektSelect(useShallow((a) => a.getSelected()));

  const handleAction = useCallback(
    (open: () => void) => {
      if (selected.length === 0) {
        toast.error("Must select at least one objekt");
      } else {
        open();
      }
    },
    [selected],
  );

  return (
    <AnimatePresence>
      {selected.length > 0 && (
        <motion.div
          className="fixed inset-x-0 bottom-2 z-10 mx-auto w-fit rounded-lg border bg-bg/80 px-1.5 py-1 shadow backdrop-blur"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
        >
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Tooltip delay={0} closeDelay={0}>
              <Toggle
                isSelected={mode}
                size="sq-sm"
                intent="outline"
                onClick={toggleMode}
                className={mode ? "!inset-ring-primary" : ""}
              >
                <HandPointingIcon weight="regular" data-slot="icon" />
              </Toggle>
              <TooltipContent inverse>Toggle select mode</TooltipContent>
            </Tooltip>
            <Button size="sm" intent="outline" onClick={() => batchSelect(objekts.toReversed())}>
              <ChecksIcon weight="regular" data-slot="icon" />
              Select all
            </Button>
            <Button size="sm" intent="outline" onClick={reset}>
              <XIcon weight="regular" data-slot="icon" />
              Deselect
            </Button>

            {children?.({ handleAction })}

            <span className="px-1 py-2 font-semibold text-sm">
              {selected.length.toLocaleString()} selected
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
