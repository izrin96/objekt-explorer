"use client";

import { Button } from "@/components/ui";
import { useObjektSelect } from "@/hooks/use-objekt-select";
import { api } from "@/lib/trpc/client";
import { toast } from "sonner";

type Props = {
  address: string;
  handleAction: (open: () => void) => void;
};

export function PinObjekt({ address, handleAction }: Props) {
  const selected = useObjektSelect((a) => a.selected);
  const reset = useObjektSelect((a) => a.reset);
  const utils = api.useUtils();
  const batchPin = api.pins.batchPin.useMutation({
    onSuccess: () => {
      utils.pins.get.invalidate(address);
      toast.success("Objekt pinned");
      reset();
    },
    onError: ({ message }) => {
      toast.error(message || "Error pin objekt");
    },
  });
  return (
    <Button
      intent="outline"
      onClick={() =>
        handleAction(() => {
          batchPin.mutate({
            address: address,
            tokenIds: selected.map((a) => Number(a.id)),
          });
        })
      }
      isPending={batchPin.isPending}
    >
      Pin
    </Button>
  );
}

export function UnpinObjekt({ address, handleAction }: Props) {
  const selected = useObjektSelect((a) => a.selected);
  const reset = useObjektSelect((a) => a.reset);
  const utils = api.useUtils();
  const batchUnpin = api.pins.batchUnpin.useMutation({
    onSuccess: () => {
      utils.pins.get.invalidate(address);
      toast.success("Objekt unpinned");
      reset();
    },
    onError: ({ message }) => {
      toast.error(message || "Error unpin objekt");
    },
  });
  return (
    <Button
      intent="outline"
      onClick={() => {
        handleAction(() => {
          batchUnpin.mutate({
            address: address,
            tokenIds: selected.map((a) => Number(a.id)),
          });
        });
      }}
      isPending={batchUnpin.isPending}
    >
      Unpin
    </Button>
  );
}
