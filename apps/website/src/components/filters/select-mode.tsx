import { ChecksIcon, HandPointingIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import type { PropsWithChildren } from "react";
import { useShallow } from "zustand/react/shallow";

import { useObjektSelect } from "@/hooks/use-objekt-select";
import { SPRING_PANEL, SPRING_SWAP } from "@/lib/ease";
import { m } from "@/paraglide/messages";

import { Button } from "../intentui/button";
import { Toggle } from "../intentui/toggle";

type Props = PropsWithChildren<{ objekts: ValidObjekt[] }>;

export function SelectMode({ children, objekts }: Props) {
  const mode = useObjektSelect((a) => a.mode);
  const batchSelect = useObjektSelect((a) => a.batchSelect);
  const toggleMode = useObjektSelect((a) => a.toggleMode);
  const reset = useObjektSelect((a) => a.reset);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Toggle isSelected={mode} intent="outline" onPress={toggleMode}>
        <HandPointingIcon weight="regular" />
        {m.filter_select_mode()}
      </Toggle>
      <Button intent="outline" onPress={() => batchSelect(objekts)}>
        <ChecksIcon weight="regular" />
        {m.filter_select_all()}
      </Button>
      {children}
      <Button intent="outline" onPress={reset}>
        <XIcon weight="regular" />
        {m.filter_clear_select()}
      </Button>
    </div>
  );
}

export function FloatingSelectMode({ children, objekts }: Props) {
  const mode = useObjektSelect((a) => a.mode);
  const batchSelect = useObjektSelect((a) => a.batchSelect);
  const reset = useObjektSelect((a) => a.reset);
  const selected = useObjektSelect(useShallow((a) => a.getSelected()));

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {mode && (
          <motion.div
            key="floating-select-mode"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={SPRING_PANEL}
            className="bg-overlay text-fg ring-border fixed inset-x-2 bottom-2 z-10 mx-auto flex w-full flex-col gap-3 rounded-lg p-2.5 shadow-lg ring md:w-fit md:flex-row md:p-2"
            style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
          >
            <div className="flex items-center gap-2">
              <div className="mx-1 flex">
                <AnimatePresence initial={false} mode="popLayout">
                  {selected.slice(0, 3).map((item) => (
                    <motion.img
                      src={item.thumbnailImage}
                      alt={item.collectionId}
                      key={item.id}
                      layout
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.4, opacity: 0 }}
                      transition={SPRING_SWAP}
                      className="outline-bg -mx-1 aspect-square h-8 w-8 overflow-hidden rounded-lg object-cover outline-3"
                    />
                  ))}
                </AnimatePresence>
                <AnimatePresence mode="popLayout">
                  {selected.length > 3 && (
                    <motion.div
                      layout
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.4, opacity: 0 }}
                      transition={SPRING_SWAP}
                      className="bg-fg text-bg -mx-1 flex items-center justify-center rounded-lg px-2 font-mono text-xs"
                    >
                      +{selected.length - 3}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={selected.length}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={SPRING_SWAP}
                  className="shrink-0 text-sm"
                >
                  {m.filter_selected_count({ count: selected.length.toLocaleString() })}
                </motion.span>
              </AnimatePresence>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              {children}

              <Button size="sm" intent="outline" onPress={() => batchSelect(objekts)}>
                <ChecksIcon weight="regular" />
                {m.filter_select_all()}
              </Button>

              <Button size="sm" intent="plain" onPress={reset}>
                {m.filter_clear()}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
