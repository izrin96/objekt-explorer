"use client";

import { ChecksIcon, HandPointingIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import type { PropsWithChildren } from "react";
import { useShallow } from "zustand/react/shallow";
import { useObjektSelect } from "@/hooks/use-objekt-select";
import type { ValidObjekt } from "@/lib/universal/objekts";
import { Button } from "../ui/button";
import { Toggle } from "../ui/toggle";

type Props = PropsWithChildren<{ objekts: ValidObjekt[] }>;

export function SelectMode({ children, objekts }: Props) {
  const t = useTranslations("filter");
  const mode = useObjektSelect((a) => a.mode);
  const batchSelect = useObjektSelect((a) => a.batchSelect);
  const toggleMode = useObjektSelect((a) => a.toggleMode);
  const reset = useObjektSelect((a) => a.reset);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Toggle isSelected={mode} intent="outline" onClick={toggleMode}>
        <HandPointingIcon weight="regular" data-slot="icon" />
        {t("select_mode")}
      </Toggle>
      <Button intent="outline" onClick={() => batchSelect(objekts)}>
        <ChecksIcon weight="regular" data-slot="icon" />
        Select all
      </Button>
      <Button intent="outline" onClick={reset}>
        <XIcon weight="regular" data-slot="icon" />
        Deselect
      </Button>
      {children}
    </div>
  );
}

export function FloatingSelectMode({ children, objekts }: Props) {
  const mode = useObjektSelect((a) => a.mode);
  const batchSelect = useObjektSelect((a) => a.batchSelect);
  const reset = useObjektSelect((a) => a.reset);
  const selected = useObjektSelect(useShallow((a) => a.getSelected()));

  return (
    <AnimatePresence>
      {mode && (
        <motion.div
          className="fixed inset-x-0 bottom-0 z-10 mx-auto flex w-full flex-col gap-3 rounded-lg rounded-b-none border bg-bg px-2.5 py-2 md:w-fit md:flex-row"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
        >
          <div className="flex items-center gap-2">
            <div className="-space-x-1 flex">
              {selected.slice(0, 3).map((item) => (
                <img
                  src={item.frontImage}
                  aria-label="objekt"
                  key={item.id}
                  className="aspect-square h-8 w-8 overflow-hidden rounded-lg object-cover outline-3 outline-bg"
                />
              ))}
              {selected.length > 3 && (
                <div className="flex items-center justify-center rounded-lg bg-fg px-2 font-mono text-bg text-xs">
                  +{selected.length - 3}
                </div>
              )}
            </div>

            <span className="text-sm">{selected.length.toLocaleString()} selected</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button size="sm" intent="outline" onClick={() => batchSelect(objekts)}>
              <ChecksIcon weight="regular" data-slot="icon" />
              Select all
            </Button>

            {children}

            <Button size="sm" intent="plain" onClick={reset}>
              Clear
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
