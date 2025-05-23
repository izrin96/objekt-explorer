"use client";

import { ValidObjekt } from "@/lib/universal/objekts";
import { Button, Loader, Menu } from "../ui";
import {
  DotsThreeVerticalIcon,
  PlusIcon,
  PushPinIcon,
  PushPinSlashIcon,
  TrashSimpleIcon,
} from "@phosphor-icons/react/dist/ssr";
import { PropsWithChildren, useCallback } from "react";
import { toast } from "sonner";
import { api } from "@/lib/trpc/client";
import { PublicProfile } from "@/lib/universal/user";

export function ObjektStaticMenu({ children }: PropsWithChildren) {
  return (
    <Menu>
      <Button
        className="absolute top-1 sm:top-1.5 p-2 right-10 z-50"
        size="extra-small"
        intent="outline"
      >
        <DotsThreeVerticalIcon size={16} weight="bold" />
      </Button>
      <Menu.Content respectScreen={false} placement="bottom right">
        {children}
      </Menu.Content>
    </Menu>
  );
}

export function AddToListMenu({ objekt }: { objekt: ValidObjekt }) {
  const { data, isLoading } = api.list.myList.useQuery();
  const addToList = api.list.addObjektsToList.useMutation({
    onSuccess: (rowCount) => {
      toast.success(`${rowCount} objekt added to the list`, {
        duration: 1300,
      });
    },
    onError: () => {
      toast.error("Error adding objekt to list");
    },
  });
  const items = data ?? [];

  const handleAction = useCallback(
    (slug: string) => {
      addToList.mutate({
        slug: slug,
        skipDups: false,
        collectionSlugs: [objekt.slug],
      });
    },
    [objekt, addToList]
  );
  return (
    <Menu.Submenu>
      <Menu.Item>
        <PlusIcon data-slot="icon" />
        <Menu.Label>Add to list</Menu.Label>
      </Menu.Item>
      <Menu.Content respectScreen={false} placement="bottom right">
        {isLoading && (
          <Menu.Item isDisabled>
            <Menu.Label>
              <Loader variant="ring" />
            </Menu.Label>
          </Menu.Item>
        )}
        {!isLoading && items.length === 0 && (
          <Menu.Item isDisabled>
            <Menu.Label>
              <span>No list found</span>
            </Menu.Label>
          </Menu.Item>
        )}
        {items.map((a) => (
          <Menu.Item key={a.slug} onAction={() => handleAction(a.slug)}>
            <Menu.Label>{a.name}</Menu.Label>
          </Menu.Item>
        ))}
      </Menu.Content>
    </Menu.Submenu>
  );
}

export function RemoveFromListMenu({
  slug,
  objekt,
}: {
  slug: string;
  objekt: ValidObjekt;
}) {
  const utils = api.useUtils();
  const removeObjektsFromList = api.list.removeObjektsFromList.useMutation({
    onSuccess: () => {
      utils.list.getEntries.invalidate(slug);
      toast.success("Objekt removed from the list", {
        duration: 1300,
      });
    },
    onError: () => {
      toast.error("Error removing objekt from list");
    },
  });

  return (
    <Menu.Item
      onAction={() =>
        removeObjektsFromList.mutate({
          slug: slug,
          ids: [Number(objekt.id)],
        })
      }
      isDanger
    >
      <TrashSimpleIcon data-slot="icon" />
      <Menu.Label>Remove from list</Menu.Label>
    </Menu.Item>
  );
}

export function TogglePinMenuItem({
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
    <Menu.Item
      onAction={() => {
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
    >
      {isPin ? (
        <PushPinSlashIcon data-slot="icon" />
      ) : (
        <PushPinIcon data-slot="icon" />
      )}
      <Menu.Label>{isPin ? "Unpin" : "Pin"}</Menu.Label>
    </Menu.Item>
  );
}
