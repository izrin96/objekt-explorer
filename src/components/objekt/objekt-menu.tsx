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
import { useQuery } from "@tanstack/react-query";
import { type PropsWithChildren, useCallback } from "react";
import { useAddToList } from "@/hooks/actions/add-to-list";
import { useBatchLock } from "@/hooks/actions/batch-lock";
import { useBatchPin } from "@/hooks/actions/batch-pin";
import { useBatchUnlock } from "@/hooks/actions/batch-unlock";
import { useBatchUnpin } from "@/hooks/actions/batch-unpin";
import { useRemoveFromList } from "@/hooks/actions/remove-from-list";
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
  const { data, isLoading } = useQuery(orpc.list.list.queryOptions());
  const addToList = useAddToList();
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
  const removeObjektsFromList = useRemoveFromList();

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
  const pin = useBatchPin(profile.address);
  const unpin = useBatchUnpin(profile.address);
  return (
    <Menu.Item
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
  const lock = useBatchLock(profile.address);
  const unlock = useBatchUnlock(profile.address);
  return (
    <Menu.Item
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
