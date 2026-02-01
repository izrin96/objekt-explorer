"use client";

import type { ValidObjekt } from "@repo/lib/types/objekt";
import type { PropsWithChildren } from "react";

import {
  CheckIcon,
  DotsThreeVerticalIcon,
  LockSimpleIcon,
  PushPinIcon,
} from "@phosphor-icons/react/dist/ssr";

import { useObjektSelect } from "@/hooks/use-objekt-select";
import { cn } from "@/utils/classes";

import { Button } from "../ui/button";
import { Menu, MenuContent } from "../ui/menu";

export function ObjektSelect({ objekt }: { objekt: ValidObjekt }) {
  const isSelected = useObjektSelect((state) => state.isSelected(objekt));
  const objektSelect = useObjektSelect((a) => a.select);
  return (
    <Button
      size="sq-xs"
      intent="plain"
      className={cn(
        "hidden bg-bg/80 px-2 text-fg hover:bg-bg group-hover:block",
        isSelected && "block",
      )}
      onClick={() => objektSelect(objekt)}
    >
      <CheckIcon className="size-3" weight="bold" />
    </Button>
  );
}

export function ObjektOverlay({
  isPin = false,
  isLocked = false,
}: {
  isPin?: boolean;
  isLocked?: boolean;
}) {
  if (!isPin && !isLocked) return;
  return (
    <div className="pointer-events-none flex items-start justify-start gap-[.2em] self-start justify-self-start rounded-lg bg-(--objekt-bg-color) p-1 text-(--objekt-text-color)">
      {isPin && <PushPinIcon weight="bold" className="size-2 sm:size-3" />}
      {isLocked && <LockSimpleIcon weight="bold" className="size-2 sm:size-3" />}
    </div>
  );
}

export function ObjektHoverMenu({ children }: PropsWithChildren) {
  return (
    <Menu>
      <Button
        size="sq-xs"
        intent="plain"
        className="pressed:block bg-bg/80 text-fg hover:bg-bg hidden px-2 group-hover:block"
      >
        <DotsThreeVerticalIcon className="size-3" weight="bold" />
      </Button>
      <MenuContent placement="bottom right">{children}</MenuContent>
    </Menu>
  );
}
