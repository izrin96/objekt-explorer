import { LockSimpleIcon, LockSimpleOpenIcon } from "@phosphor-icons/react/dist/ssr";
import { useIntlayer } from "react-intlayer";
import { useShallow } from "zustand/react/shallow";

import type { ButtonProps } from "@/components/intentui/button";
import { Button } from "@/components/intentui/button";
import { useBatchLock } from "@/hooks/actions/batch-lock";
import { useBatchUnlock } from "@/hooks/actions/batch-unlock";
import { useObjektSelect } from "@/hooks/use-objekt-select";
import { useTarget } from "@/hooks/use-target";
import { isObjektOwned } from "@/lib/objekt-utils";

export function LockObjekt({ size }: { size?: ButtonProps["size"] }) {
  const content = useIntlayer("objekt_menu");
  const target = useTarget((a) => a.profile)!;
  const selected = useObjektSelect(useShallow((a) => a.getSelected()));
  const handleAction = useObjektSelect((a) => a.handleAction);
  const batchLock = useBatchLock();
  return (
    <Button
      size={size}
      intent="outline"
      onPress={() =>
        handleAction(() => {
          batchLock.mutate({
            address: target.address,
            tokenIds: selected
              .filter(isObjektOwned)
              .map((a) => Number(a.id))
              .filter(Boolean),
          });
        })
      }
    >
      <LockSimpleIcon data-slot="icon" />
      {content.lock.value}
    </Button>
  );
}

export function UnlockObjekt({ size }: { size?: ButtonProps["size"] }) {
  const content = useIntlayer("objekt_menu");
  const target = useTarget((a) => a.profile)!;
  const selected = useObjektSelect(useShallow((a) => a.getSelected()));
  const handleAction = useObjektSelect((a) => a.handleAction);
  const batchUnlock = useBatchUnlock();
  return (
    <Button
      size={size}
      intent="outline"
      onPress={() => {
        handleAction(() => {
          batchUnlock.mutate({
            address: target.address,
            tokenIds: selected
              .filter(isObjektOwned)
              .map((a) => Number(a.id))
              .filter(Boolean),
          });
        });
      }}
    >
      <LockSimpleOpenIcon data-slot="icon" />
      {content.unlock.value}
    </Button>
  );
}
