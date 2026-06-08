import { ChecksIcon, HandPointingIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import type { PropsWithChildren } from "react";
import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import { useObjektSelect } from "@/hooks/use-objekt-select";
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
  const [isVisible, setIsVisible] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (mode) {
      setIsVisible(true);
      const timer = setTimeout(() => setIsOpen(true), 0);
      return () => clearTimeout(timer);
    } else {
      setIsOpen(false);
      const timer = setTimeout(() => setIsVisible(false), 350);
      return () => clearTimeout(timer);
    }
  }, [mode]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      data-open={isOpen}
      className="t-panel-slide bg-bg fixed inset-x-0 bottom-0 z-10 mx-auto flex w-full flex-col gap-3 rounded-lg rounded-b-none border px-2.5 py-2 md:w-fit md:flex-row"
    >
      <div className="flex items-center gap-2">
        <div className="flex -space-x-1">
          {selected.slice(0, 3).map((item) => {
            return (
              <img
                src={item.thumbnailImage}
                alt=""
                key={item.id}
                className="outline-bg aspect-square h-8 w-8 overflow-hidden rounded-lg object-cover outline-3"
              />
            );
          })}
          {selected.length > 3 && (
            <div className="bg-fg text-bg flex items-center justify-center rounded-lg px-2 font-mono text-xs">
              +{selected.length - 3}
            </div>
          )}
        </div>

        <span className="text-sm">
          {m.filter_selected_count({ count: selected.length.toLocaleString() })}
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button size="sm" intent="outline" onPress={() => batchSelect(objekts)}>
          <ChecksIcon weight="regular" />
          {m.filter_select_all()}
        </Button>

        {children}

        <Button size="sm" intent="plain" onPress={reset}>
          {m.filter_clear()}
        </Button>
      </div>
    </div>
  );
}
