"use client";

import {
  CheckIcon,
  DotsThreeVerticalIcon,
  PushPinIcon,
  PushPinSimpleIcon,
  PushPinSimpleSlashIcon,
} from "@phosphor-icons/react/dist/ssr";
import { api } from "@/lib/trpc/client";
import { toast } from "sonner";
import { PublicProfile } from "@/lib/universal/user";
import { Button, Loader, Menu } from "../ui";
import { cn } from "@/utils/classes";
import { useObjektSelect } from "@/hooks/use-objekt-select";
import { ValidObjekt } from "@/lib/universal/objekts";
import { PropsWithChildren } from "react";
import { authClient } from "@/lib/auth-client";

export function ObjektSelect({ objekt }: { objekt: ValidObjekt }) {
  const isSelected = useObjektSelect((state) => state.isSelected(objekt));
  const objektSelect = useObjektSelect((a) => a.select);
  return (
    <Button
      size="extra-small"
      intent="plain"
      className={cn(
        "group-hover:block hidden bg-bg/80 text-fg px-2",
        isSelected && "block"
      )}
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
        <div className="absolute bg-bg text-fg p-1 rounded-md">
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
      size="extra-small"
      intent="plain"
      className={cn(
        "bg-bg/80 text-fg group group-hover:flex hidden absolute top-0 left-0"
      )}
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
      <span className="text-xs font-semibold text-nowrap">
        {pin.isPending || unpin.isPending ? (
          <Loader variant="ring" />
        ) : isPin ? (
          <PushPinSimpleSlashIcon size={16} />
        ) : (
          <PushPinSimpleIcon size={16} />
        )}
      </span>
    </Button>
  );
}

export function ObjektHoverMenu({ children }: PropsWithChildren) {
  const session = authClient.useSession();

  if (!session.data) return;

  return (
    <Menu>
      <Button
        size="extra-small"
        intent="plain"
        className="hidden group-hover:block data-pressed:block bg-bg/80 text-fg px-2"
      >
        <DotsThreeVerticalIcon size={16} />
      </Button>
      <Menu.Content respectScreen={false} placement="bottom right">
        {children}
      </Menu.Content>
    </Menu>
  );
}
