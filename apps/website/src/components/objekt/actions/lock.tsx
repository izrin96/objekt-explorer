import { LockSimpleIcon, LockSimpleOpenIcon } from "@phosphor-icons/react/dist/ssr";
import { useShallow } from "zustand/react/shallow";

import type { ButtonProps } from "@/components/intentui/button";
import { Button } from "@/components/intentui/button";
import { MenuItem, MenuLabel } from "@/components/intentui/menu";
import { useBatchLock } from "@/hooks/actions/batch-lock";
import { useBatchUnlock } from "@/hooks/actions/batch-unlock";
import { useObjektSelect } from "@/hooks/use-objekt-select";
import { useProfileTarget } from "@/hooks/use-profile-target";
import { isObjektOwned } from "@/lib/objekt-utils";
import { m } from "@/paraglide/messages";

// --- Buttons ---

export function LockObjekt({ size }: { size?: ButtonProps["size"] }) {
  const target = useProfileTarget()!;
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
      <LockSimpleIcon />
      {m.objekt_menu_lock()}
    </Button>
  );
}

export function UnlockObjekt({ size }: { size?: ButtonProps["size"] }) {
  const target = useProfileTarget()!;
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
      <LockSimpleOpenIcon />
      {m.objekt_menu_unlock()}
    </Button>
  );
}

// --- Menu item ---

export function ToggleLockMenuItem({
  isLocked = false,
  tokenId,
}: {
  isLocked?: boolean;
  tokenId: string;
}) {
  const profile = useProfileTarget()!;
  const lock = useBatchLock();
  const unlock = useBatchUnlock();
  return (
    <MenuItem
      onAction={() => {
        if (isLocked) {
          unlock.mutate({
            address: profile.address,
            tokenIds: [Number(tokenId)],
          });
        } else {
          lock.mutate({
            address: profile.address,
            tokenIds: [Number(tokenId)],
          });
        }
      }}
    >
      {isLocked ? <LockSimpleOpenIcon /> : <LockSimpleIcon />}
      <MenuLabel>{isLocked ? m.objekt_menu_unlock() : m.objekt_menu_lock()}</MenuLabel>
    </MenuItem>
  );
}
