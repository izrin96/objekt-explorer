import { LockSimpleIcon, LockSimpleOpenIcon } from "@phosphor-icons/react/dist/ssr";

import { MenuItem, MenuLabel } from "@/components/intentui/menu";
import { useBatchLock } from "@/hooks/actions/batch-lock";
import { useBatchUnlock } from "@/hooks/actions/batch-unlock";
import { useProfileTarget } from "@/hooks/use-profile-target";
import { m } from "@/paraglide/messages";

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
