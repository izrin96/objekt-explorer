"use client";

import { ChecksIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { type ReactNode, useCallback } from "react";
import { toast } from "sonner";
import { useObjektSelect } from "@/hooks/use-objekt-select";
import { Button, Toggle, Tooltip } from "../ui";

type Props = {
  children?: ({ handleAction }: { handleAction: (open: () => void) => void }) => ReactNode;
};

export function SelectMode({ children }: Props) {
  const t = useTranslations("filter");
  const mode = useObjektSelect((a) => a.mode);
  const toggleMode = useObjektSelect((a) => a.toggleMode);
  const reset = useObjektSelect((a) => a.reset);
  const selected = useObjektSelect((a) => a.selected);

  const handleAction = useCallback(
    (open: () => void) => {
      if (selected.length === 0) {
        toast.error("Must select at least one objekt", {
          duration: 1300,
        });
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
        <ChecksIcon weight="regular" data-slot="icon" />
        {t("select_mode")}
      </Toggle>
      <Button intent="outline" onClick={reset}>
        <XIcon weight="regular" data-slot="icon" />
        {t("clear")}
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
      if (selected.length === 0) {
        toast.error("Must select at least one objekt", {
          duration: 1300,
        });
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
          className="fixed inset-x-0 bottom-2 z-10 mx-auto w-fit rounded border bg-bg/80 px-2 py-1 shadow backdrop-blur"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
        >
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Tooltip delay={0} closeDelay={0}>
              <Button size="sq-sm" intent="outline" onClick={reset}>
                <XIcon size={18} weight="regular" />
              </Button>
              <Tooltip.Content inverse>Clear selection</Tooltip.Content>
            </Tooltip>
            <Tooltip delay={0} closeDelay={0}>
              <Toggle
                isSelected={mode}
                size="sq-sm"
                intent="outline"
                onClick={toggleMode}
                className={mode ? "!inset-ring-primary" : ""}
              >
                <ChecksIcon weight="regular" size={18} />
              </Toggle>
              <Tooltip.Content inverse>Toggle select mode</Tooltip.Content>
            </Tooltip>
            {children?.({ handleAction })}
            <span className="px-1 py-2 font-semibold text-sm">{selected.length} selected</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
