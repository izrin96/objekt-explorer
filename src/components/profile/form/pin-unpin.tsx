"use client";

import { PushPinIcon, PushPinSlashIcon } from "@phosphor-icons/react/dist/ssr";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import { useObjektSelect } from "@/hooks/use-objekt-select";
import { orpc } from "@/lib/orpc/client";

type Props = {
  address: string;
  handleAction: (open: () => void) => void;
};

export function PinObjekt({ address, handleAction }: Props) {
  const queryClient = useQueryClient();
  const selected = useObjektSelect((a) => a.selected);
  const reset = useObjektSelect((a) => a.reset);
  const batchPin = useMutation(
    orpc.pins.batchPin.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.pins.list.key({
            input: address,
          }),
        });
        toast.success("Objekt pinned");
        reset();
      },
      onError: () => {
        toast.error("Error pin objekt");
      },
    }),
  );
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
      isPending={batchPin.isPending}
    >
      <PushPinIcon data-slot="icon" />
      Pin
    </Button>
  );
}

export function UnpinObjekt({ address, handleAction }: Props) {
  const queryClient = useQueryClient();
  const selected = useObjektSelect((a) => a.selected);
  const reset = useObjektSelect((a) => a.reset);
  const batchUnpin = useMutation(
    orpc.pins.batchUnpin.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.pins.list.key({
            input: address,
          }),
        });
        toast.success("Objekt unpinned");
        reset();
      },
      onError: () => {
        toast.error("Error unpin objekt");
      },
    }),
  );
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
      isPending={batchUnpin.isPending}
    >
      <PushPinSlashIcon data-slot="icon" />
      Unpin
    </Button>
  );
}
