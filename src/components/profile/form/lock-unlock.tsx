"use client";

import { LockSimpleIcon, LockSimpleOpenIcon } from "@phosphor-icons/react/dist/ssr";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import { useObjektSelect } from "@/hooks/use-objekt-select";
import { orpc } from "@/lib/orpc/client";

type Props = {
  address: string;
  handleAction: (open: () => void) => void;
};

export function LockObjekt({ address, handleAction }: Props) {
  const queryClient = useQueryClient();
  const selected = useObjektSelect((a) => a.selected);
  const reset = useObjektSelect((a) => a.reset);
  const batchLock = useMutation(
    orpc.lockedObjekt.batchLock.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.lockedObjekt.list.key({
            input: address,
          }),
        });
        toast.success("Objekt locked");
        reset();
      },
      onError: () => {
        toast.error("Error lock objekt");
      },
    }),
  );
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
      isPending={batchLock.isPending}
    >
      <LockSimpleIcon data-slot="icon" />
      Lock
    </Button>
  );
}

export function UnlockObjekt({ address, handleAction }: Props) {
  const queryClient = useQueryClient();
  const selected = useObjektSelect((a) => a.selected);
  const reset = useObjektSelect((a) => a.reset);
  const batchUnlock = useMutation(
    orpc.lockedObjekt.batchUnlock.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.lockedObjekt.list.key({
            input: address,
          }),
        });
        toast.success("Objekt unlocked");
        reset();
      },
      onError: () => {
        toast.error("Error unlock objekt");
      },
    }),
  );
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
      isPending={batchUnlock.isPending}
    >
      <LockSimpleOpenIcon data-slot="icon" />
      Unlock
    </Button>
  );
}
