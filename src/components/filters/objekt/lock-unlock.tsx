"use client";

import { LockSimpleIcon, LockSimpleOpenIcon } from "@phosphor-icons/react/dist/ssr";
import { useShallow } from "zustand/react/shallow";
import type { ObjektActionProps } from "@/components/filters/objekt/common";
import { Button } from "@/components/ui/button";
import { useBatchLock } from "@/hooks/actions/batch-lock";
import { useBatchUnlock } from "@/hooks/actions/batch-unlock";
import { useObjektSelect } from "@/hooks/use-objekt-select";
import { useTarget } from "@/hooks/use-target";

export function LockObjekt({ handleAction, size }: ObjektActionProps) {
  const target = useTarget((a) => a.profile)!;
  const selected = useObjektSelect(useShallow((a) => a.getSelected()));
  const batchLock = useBatchLock();
  return (
    <Button
      size={size}
      intent="outline"
      onClick={() =>
        handleAction(() => {
          batchLock.mutate({
            address: target.address,
            tokenIds: selected
              .filter((objekt) => "serial" in objekt)
              .map((a) => Number(a.id))
              .filter(Boolean),
          });
        })
      }
    >
      <LockSimpleIcon data-slot="icon" />
      Lock
    </Button>
  );
}

export function UnlockObjekt({ handleAction, size }: ObjektActionProps) {
  const target = useTarget((a) => a.profile)!;
  const selected = useObjektSelect(useShallow((a) => a.getSelected()));
  const batchUnlock = useBatchUnlock();
  return (
    <Button
      size={size}
      intent="outline"
      onClick={() => {
        handleAction(() => {
          batchUnlock.mutate({
            address: target.address,
            tokenIds: selected
              .filter((objekt) => "serial" in objekt)
              .map((a) => Number(a.id))
              .filter(Boolean),
          });
        });
      }}
    >
      <LockSimpleOpenIcon data-slot="icon" />
      Unlock
    </Button>
  );
}
