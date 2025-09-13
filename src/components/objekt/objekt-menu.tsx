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
import { Button, Loader, Menu, MenuContent, MenuItem, MenuLabel, MenuSubmenu } from "../ui";

export function ObjektStaticMenu({ children }: PropsWithChildren) {
  return (
    <Menu>
      <Button className="absolute top-1 right-10 z-50 p-2 sm:top-2" size="sq-xs" intent="outline">
        <DotsThreeVerticalIcon size={16} weight="bold" />
      </Button>
      <MenuContent placement="bottom right">{children}</MenuContent>
    </Menu>
  );
}

export function AddToListMenu({ objekt }: { objekt: ValidObjekt }) {
  const { data } = useQuery(orpc.list.list.queryOptions());
  const addToList = useAddToList();

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
    <MenuSubmenu>
      <MenuItem>
        <PlusIcon data-slot="icon" />
        <MenuLabel>Add to list</MenuLabel>
      </MenuItem>
      <MenuContent placement="bottom right">
        {!data && (
          <MenuItem isDisabled>
            <MenuLabel>
              <Loader variant="ring" />
            </MenuLabel>
          </MenuItem>
        )}
        {data && data.length === 0 && (
          <MenuItem isDisabled>
            <MenuLabel>
              <span>No list found</span>
            </MenuLabel>
          </MenuItem>
        )}
        {data?.map((a) => (
          <MenuItem key={a.slug} onAction={() => handleAction(a.slug)}>
            <MenuLabel>{a.name}</MenuLabel>
          </MenuItem>
        ))}
      </MenuContent>
    </MenuSubmenu>
  );
}

export function RemoveFromListMenu({ slug, objekt }: { slug: string; objekt: ValidObjekt }) {
  const removeObjektsFromList = useRemoveFromList();

  return (
    <MenuItem
      onAction={() =>
        removeObjektsFromList.mutate({
          slug: slug,
          ids: [Number(objekt.id)],
        })
      }
      isDanger
    >
      <TrashSimpleIcon data-slot="icon" />
      <MenuLabel>Remove from list</MenuLabel>
    </MenuItem>
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
      {isPin ? <PushPinSlashIcon data-slot="icon" /> : <PushPinIcon data-slot="icon" />}
      <MenuLabel>{isPin ? "Unpin" : "Pin"}</MenuLabel>
    </MenuItem>
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
      {isLocked ? <LockSimpleOpenIcon data-slot="icon" /> : <LockSimpleIcon data-slot="icon" />}
      <MenuLabel>{isLocked ? "Unlock" : "Lock"}</MenuLabel>
    </MenuItem>
  );
}

export function SelectMenuItem({ objekt }: { objekt: ValidObjekt }) {
  const objektSelect = useObjektSelect((a) => a.select);
  const isSelected = useObjektSelect((state) => state.isSelected(objekt));
  return (
    <MenuItem onAction={() => objektSelect(objekt)}>
      <CheckIcon data-slot="icon" />
      <MenuLabel>{isSelected ? "Unselect" : "Select"}</MenuLabel>
    </MenuItem>
  );
}
