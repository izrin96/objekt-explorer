"use client";

import {
  CheckIcon,
  DotsThreeVerticalIcon,
  PushPinIcon,
  PushPinSlashIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { PropsWithChildren } from "react";
import { toast } from "sonner";
import { useObjektSelect } from "@/hooks/use-objekt-select";
import { api } from "@/lib/trpc/client";
import type { ValidObjekt } from "@/lib/universal/objekts";
import type { PublicProfile } from "@/lib/universal/user";
import { cn } from "@/utils/classes";
import { Button, Loader, Menu } from "../ui";

export function ObjektSelect({ objekt }: { objekt: ValidObjekt }) {
  const isSelected = useObjektSelect((state) => state.isSelected(objekt));
  const objektSelect = useObjektSelect((a) => a.select);
  return (
    <Button
      size="sq-sm"
      intent="plain"
      className={cn("hidden bg-bg/80 px-2 text-fg group-hover:block", isSelected && "block")}
      onClick={() => objektSelect(objekt)}
    >
      <CheckIcon size="16" weight="bold" />
    </Button>
  );
}

export function ObjektOverlay({ isPin }: { isPin: boolean }) {
  return (
    <>
      {isPin && (
        <div className="absolute rounded-md bg-bg p-1 text-fg">
          <PushPinIcon weight="bold" size={12} />
        </div>
      )}
    </>
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
  const utils = api.useUtils();
  const pin = api.pins.pin.useMutation({
    onSuccess: () => {
      utils.pins.get.invalidate(profile.address);
      toast.success("Objekt pinned");
    },
    onError: () => {
      toast.error("Error pin objekt");
    },
  });
  const unpin = api.pins.unpin.useMutation({
    onSuccess: () => {
      utils.pins.get.invalidate(profile.address);
      toast.success("Objekt unpinned");
    },
    onError: () => {
      toast.error("Error unpin objekt");
    },
  });
  return (
    <Button
      size="sq-sm"
      intent="plain"
      className={cn("group absolute top-0 left-0 hidden bg-bg/80 text-fg group-hover:flex")}
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
          <PushPinSlashIcon size={16} />
        ) : (
          <PushPinIcon size={16} />
        )}
      </span>
    </Button>
  );
}

export function ObjektHoverMenu({ children }: PropsWithChildren) {
  return (
    <Menu>
      <Button
        size="sq-sm"
        intent="plain"
        className="hidden bg-bg/80 px-2 text-fg group-hover:block data-pressed:block"
      >
        <DotsThreeVerticalIcon size={16} weight="bold" />
      </Button>
      <Menu.Content placement="bottom right">{children}</Menu.Content>
    </Menu>
  );
}
