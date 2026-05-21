import { PushPinIcon, PushPinSlashIcon } from "@phosphor-icons/react/dist/ssr";
import { useShallow } from "zustand/react/shallow";

import type { ButtonProps } from "@/components/intentui/button";
import { Button } from "@/components/intentui/button";
import { useBatchPin } from "@/hooks/actions/batch-pin";
import { useBatchUnpin } from "@/hooks/actions/batch-unpin";
import { useObjektSelect } from "@/hooks/use-objekt-select";
import { useProfileTarget } from "@/hooks/use-profile-target";
import { isObjektOwned } from "@/lib/objekt-utils";
import { m } from "@/paraglide/messages";

export function PinObjekt({ size }: { size?: ButtonProps["size"] }) {
  const target = useProfileTarget()!;
  const selected = useObjektSelect(useShallow((a) => a.getSelected()));
  const handleAction = useObjektSelect((a) => a.handleAction);
  const batchPin = useBatchPin();
  return (
    <Button
      size={size}
      intent="outline"
      onPress={() =>
        handleAction(() => {
          batchPin.mutate({
            address: target.address,
            tokenIds: selected
              .filter(isObjektOwned)
              .map((a) => Number(a.id))
              .filter(Boolean),
          });
        })
      }
    >
      <PushPinIcon />
      {m.objekt_menu_pin()}
    </Button>
  );
}

export function UnpinObjekt({ size }: { size?: ButtonProps["size"] }) {
  const target = useProfileTarget()!;
  const selected = useObjektSelect(useShallow((a) => a.getSelected()));
  const handleAction = useObjektSelect((a) => a.handleAction);
  const batchUnpin = useBatchUnpin();
  return (
    <Button
      size={size}
      intent="outline"
      onPress={() => {
        handleAction(() => {
          batchUnpin.mutate({
            address: target.address,
            tokenIds: selected
              .filter(isObjektOwned)
              .map((a) => Number(a.id))
              .filter(Boolean),
          });
        });
      }}
    >
      <PushPinSlashIcon />
      {m.objekt_menu_unpin()}
    </Button>
  );
}
