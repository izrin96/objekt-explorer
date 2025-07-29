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
import { useBatchLock } from "@/hooks/actions/batch-lock";
import { useBatchPin } from "@/hooks/actions/batch-pin";
import { useBatchUnlock } from "@/hooks/actions/batch-unlock";
import { useBatchUnpin } from "@/hooks/actions/batch-unpin";
import { useObjektSelect } from "@/hooks/use-objekt-select";
import type { ValidObjekt } from "@/lib/universal/objekts";
import type { PublicProfile } from "@/lib/universal/user";
import { cn } from "@/utils/classes";
import { Button, Menu } from "../ui";

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
      <CheckIcon size={12} weight="bold" />
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
  const pin = useBatchPin();
  const unpin = useBatchUnpin();
  return (
    <Button
      size="sq-xs"
      intent="plain"
      className="bg-bg/80"
      onClick={() => {
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
      <span className="text-nowrap font-semibold text-xs">
        {isPin ? <PushPinSlashIcon size={12} /> : <PushPinIcon size={12} />}
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
  const lock = useBatchLock();
  const unlock = useBatchUnlock();
  return (
    <Button
      size="sq-xs"
      intent="plain"
      className="bg-bg/80"
      onClick={() => {
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
      <span className="text-nowrap font-semibold text-xs">
        {isLocked ? <LockSimpleOpenIcon size={12} /> : <LockSimpleIcon size={12} />}
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
        <DotsThreeVerticalIcon size={12} weight="bold" />
      </Button>
      <Menu.Content placement="bottom right">{children}</Menu.Content>
    </Menu>
  );
}
