"use client";

import {
  PushPin,
  PushPinSimple,
  PushPinSimpleSlash,
} from "@phosphor-icons/react/dist/ssr";
import { api } from "@/lib/trpc/client";
import { toast } from "sonner";
import { PublicProfile } from "@/lib/universal/user";
import { Button, Loader } from "../ui";
import { cn } from "@/utils/classes";

export function ObjektOverlay({
  isPin,
  profile,
  tokenId,
  isOwned,
}: {
  isPin: boolean;
  profile: PublicProfile;
  tokenId: string;
  isOwned: boolean;
}) {
  return (
    <>
      {isPin && (
        <div className="absolute top-0.5 left-0.5 bg-bg/30 text-fg p-1.5 rounded-md">
          <PushPin weight="bold" size={12} />
        </div>
      )}
      {isOwned && (
        <TogglePin isPin={isPin} profile={profile} tokenId={tokenId} />
      )}
    </>
  );
}

export function TogglePin({
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
    },
    onError: ({ message }) => {
      toast.error(message || "Error pin objekt");
    },
  });
  const unpin = api.pins.unpin.useMutation({
    onSuccess: () => {
      utils.pins.get.invalidate(profile.address);
    },
    onError: ({ message }) => {
      toast.error(message || "Error unpin objekt");
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
          <PushPinSimpleSlash size={16} />
        ) : (
          <PushPinSimple size={16} />
        )}
      </span>
    </Button>
  );
}
