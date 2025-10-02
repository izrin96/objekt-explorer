"use client";

import { PushPinIcon, PushPinSlashIcon } from "@phosphor-icons/react/dist/ssr";
import { useShallow } from "zustand/react/shallow";
import type { ObjektActionProps } from "@/components/filters/objekt/common";
import { Button } from "@/components/ui/button";
import { useBatchPin } from "@/hooks/actions/batch-pin";
import { useBatchUnpin } from "@/hooks/actions/batch-unpin";
import { useObjektSelect } from "@/hooks/use-objekt-select";
import { useTarget } from "@/hooks/use-target";

export function PinObjekt({ handleAction, size }: ObjektActionProps) {
  const target = useTarget((a) => a.profile)!;
  const selected = useObjektSelect(useShallow((a) => a.getSelected()));
  const batchPin = useBatchPin();
  return (
    <Button
      size={size}
      intent="outline"
      onClick={() =>
        handleAction(() => {
          batchPin.mutate({
            address: target.address,
            tokenIds: selected
              .filter((objekt) => "serial" in objekt)
              .map((a) => Number(a.id))
              .filter(Boolean),
          });
        })
      }
    >
      <PushPinIcon data-slot="icon" />
      Pin
    </Button>
  );
}

export function UnpinObjekt({ handleAction }: ObjektActionProps) {
  const target = useTarget((a) => a.profile)!;
  const selected = useObjektSelect(useShallow((a) => a.getSelected()));
  const batchUnpin = useBatchUnpin();
  return (
    <Button
      intent="outline"
      onClick={() => {
        handleAction(() => {
          batchUnpin.mutate({
            address: target.address,
            tokenIds: selected
              .filter((objekt) => "serial" in objekt)
              .map((a) => Number(a.id))
              .filter(Boolean),
          });
        });
      }}
    >
      <PushPinSlashIcon data-slot="icon" />
      Unpin
    </Button>
  );
}
