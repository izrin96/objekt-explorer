import {
  CaretDownIcon,
  CaretUpIcon,
  PushPinIcon,
  PushPinSlashIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useShallow } from "zustand/react/shallow";

import type { ButtonProps } from "@/components/intentui/button";
import { Button } from "@/components/intentui/button";
import { MenuItem, MenuLabel } from "@/components/intentui/menu";
import { useBatchPin } from "@/hooks/actions/batch-pin";
import { useBatchUnpin } from "@/hooks/actions/batch-unpin";
import { useMovePin } from "@/hooks/actions/move-pin";
import { useObjektSelect } from "@/hooks/use-objekt-select";
import { useProfileTarget } from "@/hooks/use-profile-target";
import { isObjektOwned } from "@/lib/objekt-utils";
import { m } from "@/paraglide/messages";

// --- Buttons ---

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
              .map((a) => Number(a.tokenId))
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
              .map((a) => Number(a.tokenId))
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

// --- Menu items ---

export function TogglePinMenuItem({
  isPin = false,
  tokenId,
}: {
  isPin?: boolean;
  tokenId: string;
}) {
  const profile = useProfileTarget()!;
  const pin = useBatchPin();
  const unpin = useBatchUnpin();
  return (
    <MenuItem
      onAction={() => {
        if (isPin) {
          unpin.mutate({
            address: profile.address,
            tokenIds: [Number(tokenId)],
          });
        } else {
          pin.mutate({
            address: profile.address,
            tokenIds: [Number(tokenId)],
          });
        }
      }}
    >
      {isPin ? <PushPinSlashIcon /> : <PushPinIcon />}
      <MenuLabel>{isPin ? m.objekt_menu_unpin() : m.objekt_menu_pin()}</MenuLabel>
    </MenuItem>
  );
}

export function MovePinMenuItem({
  tokenId,
  direction,
}: {
  tokenId: string;
  direction: "up" | "down";
}) {
  const profile = useProfileTarget()!;
  const movePin = useMovePin();
  return (
    <MenuItem
      onAction={() => {
        movePin.mutate({
          address: profile.address,
          tokenId: Number(tokenId),
          direction,
        });
      }}
    >
      {direction === "up" ? <CaretUpIcon /> : <CaretDownIcon />}
      <MenuLabel>
        {direction === "up" ? m.objekt_menu_move_up() : m.objekt_menu_move_down()}
      </MenuLabel>
    </MenuItem>
  );
}
