"use client";

import { LockSimpleIcon, LockSimpleOpenIcon } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui";
import { useBatchLock } from "@/hooks/actions/batch-lock";
import { useBatchUnlock } from "@/hooks/actions/batch-unlock";
import { useObjektSelect } from "@/hooks/use-objekt-select";

type Props = {
  address: string;
  handleAction: (open: () => void) => void;
};

export function LockObjekt({ address, handleAction }: Props) {
  const selected = useObjektSelect((a) => a.selected);
  const reset = useObjektSelect((a) => a.reset);
  const batchLock = useBatchLock(address, {
    onSuccess: () => {
      reset();
    },
  });
  return (
    <Button
      intent="outline"
      onClick={() =>
        handleAction(() => {
          batchLock.mutate({
            address: address,
            tokenIds: selected.map((a) => Number(a.id)).filter(Boolean),
          });
        })
      }
    >
      <LockSimpleIcon data-slot="icon" />
      Lock
    </Button>
  );
}

export function UnlockObjekt({ address, handleAction }: Props) {
  const selected = useObjektSelect((a) => a.selected);
  const reset = useObjektSelect((a) => a.reset);
  const batchUnlock = useBatchUnlock(address, {
    onSuccess: () => {
      reset();
    },
  });
  return (
    <Button
      intent="outline"
      onClick={() => {
        handleAction(() => {
          batchUnlock.mutate({
            address: address,
            tokenIds: selected.map((a) => Number(a.id)).filter(Boolean),
          });
        });
      }}
    >
      <LockSimpleOpenIcon data-slot="icon" />
      Unlock
    </Button>
  );
}
