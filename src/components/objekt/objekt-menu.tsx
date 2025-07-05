"use client";

import {
  CheckIcon,
  DotsThreeVerticalIcon,
  LockSimpleIcon,
  LockSimpleOpenIcon,
  PlusIcon,
  PushPinIcon,
  PushPinSlashIcon,
  TrashSimpleIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type PropsWithChildren, useCallback } from "react";
import { toast } from "sonner";
import { useObjektSelect } from "@/hooks/use-objekt-select";
import { orpc } from "@/lib/orpc/client";
import type { ValidObjekt } from "@/lib/universal/objekts";
import type { PublicProfile } from "@/lib/universal/user";
import { Button, Loader, Menu } from "../ui";

export function ObjektStaticMenu({ children }: PropsWithChildren) {
  return (
    <Menu>
      <Button className="absolute top-1 right-10 z-50 p-2 sm:top-2" size="sq-xs" intent="outline">
        <DotsThreeVerticalIcon size={16} weight="bold" />
      </Button>
      <Menu.Content placement="bottom right">{children}</Menu.Content>
    </Menu>
  );
}

export function AddToListMenu({ objekt }: { objekt: ValidObjekt }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(orpc.list.list.queryOptions());
  const addToList = useMutation(
    orpc.list.addObjektsToList.mutationOptions({
      onSuccess: (rowCount, { slug }) => {
        queryClient.invalidateQueries({
          queryKey: orpc.list.listEntries.key({
            input: slug,
          }),
        });
        toast.success(`${rowCount} objekt added to the list`, {
          duration: 1300,
        });
      },
      onError: () => {
        toast.error("Error adding objekt to list");
      },
    }),
  );
  const items = data ?? [];

  const handleAction = useCallback(
    (slug: string) => {
      addToList.mutate({
        slug: slug,
        skipDups: false,
        collectionSlugs: [objekt.slug],
      });
    },
    [objekt, addToList],
  );
  return (
    <Menu.Submenu>
      <Menu.Item>
        <PlusIcon data-slot="icon" />
        <Menu.Label>Add to list</Menu.Label>
      </Menu.Item>
      <Menu.Content placement="bottom right">
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

export function RemoveFromListMenu({ slug, objekt }: { slug: string; objekt: ValidObjekt }) {
  const queryClient = useQueryClient();
  const removeObjektsFromList = useMutation(
    orpc.list.removeObjektsFromList.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.list.listEntries.key({
            input: slug,
          }),
        });
        toast.success("Objekt removed from the list", {
          duration: 1300,
        });
      },
      onError: () => {
        toast.error("Error removing objekt from list");
      },
    }),
  );

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
  const queryClient = useQueryClient();
  const pin = useMutation(
    orpc.pins.pin.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.pins.list.key({
            input: profile.address,
          }),
        });
        toast.success("Objekt pinned");
      },
      onError: () => {
        toast.error("Error pin objekt");
      },
    }),
  );
  const unpin = useMutation(
    orpc.pins.unpin.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.pins.list.key({
            input: profile.address,
          }),
        });
        toast.success("Objekt unpinned");
      },
      onError: () => {
        toast.error("Error unpin objekt");
      },
    }),
  );
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
      {isPin ? <PushPinSlashIcon data-slot="icon" /> : <PushPinIcon data-slot="icon" />}
      <Menu.Label>{isPin ? "Unpin" : "Pin"}</Menu.Label>
    </Menu.Item>
  );
}

export function ToggleLockMenuItem({
  profile,
  isLocked,
  tokenId,
}: {
  profile: PublicProfile;
  isLocked: boolean;
  tokenId: string;
}) {
  const queryClient = useQueryClient();
  const lock = useMutation(
    orpc.lockedObjekt.lock.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.lockedObjekt.list.key({
            input: profile.address,
          }),
        });
        toast.success("Objekt locked");
      },
      onError: () => {
        toast.error("Error lock objekt");
      },
    }),
  );
  const unlock = useMutation(
    orpc.lockedObjekt.unlock.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.lockedObjekt.list.key({
            input: profile.address,
          }),
        });
        toast.success("Objekt unlocked");
      },
      onError: () => {
        toast.error("Error unlock objekt");
      },
    }),
  );
  return (
    <Menu.Item
      onAction={() => {
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
    >
      {isLocked ? <LockSimpleOpenIcon data-slot="icon" /> : <LockSimpleIcon data-slot="icon" />}
      <Menu.Label>{isLocked ? "Unlock" : "Lock"}</Menu.Label>
    </Menu.Item>
  );
}

export function SelectMenuItem({ objekt }: { objekt: ValidObjekt }) {
  const objektSelect = useObjektSelect((a) => a.select);
  const isSelected = useObjektSelect((state) => state.isSelected(objekt));
  return (
    <Menu.Item onAction={() => objektSelect(objekt)}>
      <CheckIcon data-slot="icon" />
      <Menu.Label>{isSelected ? "Unselect" : "Select"}</Menu.Label>
    </Menu.Item>
  );
}
