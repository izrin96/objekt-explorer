"use client";

import { PushPinIcon, PushPinSlashIcon } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui";
import { useBatchPin } from "@/hooks/actions/batch-pin";
import { useBatchUnpin } from "@/hooks/actions/batch-unpin";
import { useObjektSelect } from "@/hooks/use-objekt-select";

type Props = {
  address: string;
  handleAction: (open: () => void) => void;
};

export function PinObjekt({ address, handleAction }: Props) {
  const selected = useObjektSelect((a) => a.selected);
  const reset = useObjektSelect((a) => a.reset);
  const batchPin = useBatchPin(address, {
    onSuccess: () => {
      reset();
    },
  });
  return (
    <Button
      intent="outline"
      onClick={() =>
        handleAction(() => {
          batchPin.mutate({
            address: address,
            tokenIds: selected.map((a) => Number(a.id)).filter(Boolean),
          });
        })
      }
    >
      <PushPinIcon data-slot="icon" />
      Pin
    </Button>
  );
}

export function UnpinObjekt({ address, handleAction }: Props) {
  const selected = useObjektSelect((a) => a.selected);
  const reset = useObjektSelect((a) => a.reset);
  const batchUnpin = useBatchUnpin(address, {
    onSuccess: () => {
      reset();
    },
  });
  return (
    <Button
      intent="outline"
      onClick={() => {
        handleAction(() => {
          batchUnpin.mutate({
            address: address,
            tokenIds: selected.map((a) => Number(a.id)).filter(Boolean),
          });
        });
      }}
    >
      <PushPinSlashIcon data-slot="icon" />
      Unpin
    </Button>
  );
}
