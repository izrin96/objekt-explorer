import { ChecksIcon, HandPointingIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import { AnimatePresence, motion } from "motion/react";
import type { PropsWithChildren } from "react";
import { useShallow } from "zustand/react/shallow";
import { useObjektSelect } from "@/hooks/use-objekt-select";
import type { ValidObjekt } from "@/lib/universal/objekts";
import { Button } from "../ui/button";
import { Toggle } from "../ui/toggle";
import { Tooltip, TooltipContent } from "../ui/tooltip";

type Props = PropsWithChildren<{ objekts: ValidObjekt[] }>;

export function SelectMode({ children, objekts }: Props) {
  const mode = useObjektSelect((a) => a.mode);
  const batchSelect = useObjektSelect((a) => a.batchSelect);
  const toggleMode = useObjektSelect((a) => a.toggleMode);
  const reset = useObjektSelect((a) => a.reset);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Toggle isSelected={mode} intent="outline" onClick={toggleMode}>
        <HandPointingIcon weight="regular" data-slot="icon" />
        Select mode
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
  const toggleMode = useObjektSelect((a) => a.toggleMode);
  const reset = useObjektSelect((a) => a.reset);
  const selected = useObjektSelect(useShallow((a) => a.getSelected()));

  return (
    <AnimatePresence>
      {selected.length > 0 && (
        <motion.div
          className="fixed inset-x-0 bottom-0 z-10 mx-auto w-fit rounded-lg rounded-b-none border bg-bg px-1.5 py-1"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
        >
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Tooltip delay={0} closeDelay={0}>
              <Toggle isSelected={mode} size="sq-sm" intent="outline" onClick={toggleMode}>
                <HandPointingIcon weight="regular" data-slot="icon" />
              </Toggle>
              <TooltipContent inverse>Toggle select mode</TooltipContent>
            </Tooltip>
            <Button size="sm" intent="outline" onClick={() => batchSelect(objekts)}>
              <ChecksIcon weight="regular" data-slot="icon" />
              Select all
            </Button>
            <Button size="sm" intent="outline" onClick={reset}>
              <XIcon weight="regular" data-slot="icon" />
              Deselect
            </Button>

            {children}

            <span className="px-1 py-2 font-semibold text-sm">
              {selected.length.toLocaleString()} selected
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
