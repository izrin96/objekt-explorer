"use client";

import {
  CheckIcon,
  DotsThreeVerticalIcon,
  LockSimpleIcon,
  LockSimpleOpenIcon,
  PushPinIcon,
  PushPinSlashIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { PropsWithChildren } from "react";
import { useLock } from "@/hooks/actions/lock";
import { usePin } from "@/hooks/actions/pin";
import { useUnlock } from "@/hooks/actions/unlock";
import { useUnpin } from "@/hooks/actions/unpin";
import { useObjektSelect } from "@/hooks/use-objekt-select";
import type { ValidObjekt } from "@/lib/universal/objekts";
import type { PublicProfile } from "@/lib/universal/user";
import { cn } from "@/utils/classes";
import { Button, Loader, Menu } from "../ui";

export function ObjektSelect({ objekt }: { objekt: ValidObjekt }) {
  const isSelected = useObjektSelect((state) => state.isSelected(objekt));
  const objektSelect = useObjektSelect((a) => a.select);
  return (
    <Button
      size="sq-xs"
      intent="plain"
      className={cn("hidden bg-bg/80 px-2 text-fg group-hover:block", isSelected && "block")}
      onClick={() => objektSelect(objekt)}
    >
      <CheckIcon size={14} weight="bold" />
    </Button>
  );
}

export function ObjektOverlay({ isPin, isLocked }: { isPin: boolean; isLocked: boolean }) {
  return (
    <div className="absolute top-0 left-0 flex">
      {isPin && (
        <div className="rounded bg-bg p-1 text-fg">
          <PushPinIcon weight="bold" size={12} />
        </div>
      )}
      {isLocked && (
        <div className="rounded bg-bg p-1 text-fg">
          <LockSimpleIcon weight="bold" size={12} />
        </div>
      )}
    </div>
  );
}

export function ObjektTogglePin({
  profile,
  isPin,
  tokenId,
}: {
  profile: PublicProfile;
  isPin: boolean;
  tokenId: string;
}) {
  const pin = usePin(profile.address);
  const unpin = useUnpin(profile.address);
  return (
    <Button
      size="sq-xs"
      intent="plain"
      className="bg-bg/80"
      onClick={() => {
        if (isPin) {
          unpin.mutate({
            address: profile.address,
            tokenId: Number(tokenId),
          });
        } else {
          pin.mutate({
            address: profile.address,
            tokenId: Number(tokenId),
          });
        }
      }}
      isPending={pin.isPending || unpin.isPending}
    >
      <span className="text-nowrap font-semibold text-xs">
        {pin.isPending || unpin.isPending ? (
          <Loader variant="ring" />
        ) : isPin ? (
          <PushPinSlashIcon size={14} />
        ) : (
          <PushPinIcon size={14} />
        )}
      </span>
    </Button>
  );
}

export function ObjektToggleLock({
  profile,
  isLocked,
  tokenId,
}: {
  profile: PublicProfile;
  isLocked: boolean;
  tokenId: string;
}) {
  const lock = useLock(profile.address);
  const unlock = useUnlock(profile.address);
  return (
    <Button
      size="sq-xs"
      intent="plain"
      className="bg-bg/80"
      onClick={() => {
        if (isLocked) {
          unlock.mutate({
            address: profile.address,
            tokenId: Number(tokenId),
          });
        } else {
          lock.mutate({
            address: profile.address,
            tokenId: Number(tokenId),
          });
        }
      }}
      isPending={lock.isPending || unlock.isPending}
    >
      <span className="text-nowrap font-semibold text-xs">
        {lock.isPending || unlock.isPending ? (
          <Loader variant="ring" />
        ) : isLocked ? (
          <LockSimpleOpenIcon size={14} />
        ) : (
          <LockSimpleIcon size={14} />
        )}
      </span>
    </Button>
  );
}

export function ObjektHoverMenu({ children }: PropsWithChildren) {
  return (
    <Menu>
      <Button
        size="sq-xs"
        intent="plain"
        className="hidden bg-bg/80 px-2 text-fg group-hover:block data-pressed:block"
      >
        <DotsThreeVerticalIcon size={14} weight="bold" />
      </Button>
      <Menu.Content placement="bottom right">{children}</Menu.Content>
    </Menu>
  );
}
