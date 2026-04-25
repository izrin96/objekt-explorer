import {
  CaretDownIcon,
  CaretUpIcon,
  CheckIcon,
  CurrencyDollarIcon,
  DotsThreeVerticalIcon,
  LockSimpleIcon,
  LockSimpleOpenIcon,
  PlusIcon,
  PushPinIcon,
  PushPinSlashIcon,
  TrashSimpleIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useQuery } from "@tanstack/react-query";
import { type PropsWithChildren } from "react";
import { useIntlayer } from "react-intlayer";

import { useAddToList } from "@/hooks/actions/add-to-list";
import { useBatchLock } from "@/hooks/actions/batch-lock";
import { useBatchPin } from "@/hooks/actions/batch-pin";
import { useBatchUnlock } from "@/hooks/actions/batch-unlock";
import { useBatchUnpin } from "@/hooks/actions/batch-unpin";
import { useMovePin } from "@/hooks/actions/move-pin";
import { useRemoveFromList } from "@/hooks/actions/remove-from-list";
import { useListTarget } from "@/hooks/use-list-target";
import { useObjektSelect } from "@/hooks/use-objekt-select";
import { useProfileTarget } from "@/hooks/use-profile-target";
import { orpc } from "@/lib/orpc/client";
import { parseNickname } from "@/lib/utils";

import { Button } from "../intentui/button";
import { Loader } from "../intentui/loader";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSubMenu } from "../intentui/menu";

export function ObjektStaticMenu({ children }: PropsWithChildren) {
  return (
    <Menu>
      <Button className="absolute top-1 right-10 z-50 p-2 sm:top-2" size="sq-xs" intent="outline">
        <DotsThreeVerticalIcon size={16} weight="bold" />
      </Button>
      <MenuContent placement="bottom right" popover={{ offset: -2 }}>
        {children}
      </MenuContent>
    </Menu>
  );
}

export function AddToListMenu({ objekts, address }: { objekts: ValidObjekt[]; address?: string }) {
  const { data: lists } = useQuery(orpc.list.list.queryOptions());
  const addToList = useAddToList();
  const content = useIntlayer("objekt_menu");

  const availableLists = lists?.filter((list) => {
    if (address) {
      return (
        list.listType === "normal" ||
        (list.listType === "profile" && list.profileAddress === address.toLowerCase())
      );
    } else {
      return list.listType === "normal";
    }
  });

  const handleAction = (slug: string, listType: "normal" | "profile") => {
    addToList.mutate({
      slug: slug,
      skipDups: false,
      objekts: listType === "profile" ? objekts.map((a) => a.id) : undefined,
      collectionSlugs: listType === "normal" ? objekts.map((a) => a.slug) : undefined,
    });
  };

  return (
    <MenuSubMenu>
      <MenuItem>
        <PlusIcon data-slot="icon" />
        <MenuLabel>{content.add_to_list.value}</MenuLabel>
      </MenuItem>
      <MenuContent placement="bottom right" popover={{ offset: -2 }}>
        {!availableLists && (
          <MenuItem isDisabled>
            <MenuLabel>
              <Loader variant="ring" />
            </MenuLabel>
          </MenuItem>
        )}
        {availableLists && availableLists.length === 0 && (
          <MenuItem isDisabled>
            <MenuLabel>
              <span>{content.no_list_found.value}</span>
            </MenuLabel>
          </MenuItem>
        )}
        {availableLists?.map((a) => (
          <MenuItem key={a.slug} onAction={() => handleAction(a.slug, a.listType)}>
            <MenuLabel>
              {a.name}{" "}
              {a.profileAddress && (
                <span className="text-muted-fg text-xs">
                  ({parseNickname(a.profileAddress, a.nickname)})
                </span>
              )}
            </MenuLabel>
          </MenuItem>
        ))}
      </MenuContent>
    </MenuSubMenu>
  );
}

export function RemoveFromListMenu({ objekts }: { objekts: ValidObjekt[] }) {
  const target = useListTarget();
  const removeObjektsFromList = useRemoveFromList();
  const content = useIntlayer("objekt_menu");

  return (
    <MenuItem
      onAction={() =>
        removeObjektsFromList.mutate({
          slug: target.slug,
          ids: objekts.map((a) => Number(a.id)),
        })
      }
      intent="danger"
    >
      <TrashSimpleIcon data-slot="icon" />
      <MenuLabel>{content.remove_from_list.value}</MenuLabel>
    </MenuItem>
  );
}

export function TogglePinMenuItem({
  isPin = false,
  tokenId,
}: {
  isPin?: boolean;
  tokenId: string;
}) {
  const profile = useProfileTarget();
  const pin = useBatchPin();
  const unpin = useBatchUnpin();
  const content = useIntlayer("objekt_menu");
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
      <MenuLabel>{isPin ? content.unpin.value : content.pin.value}</MenuLabel>
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
  const profile = useProfileTarget();
  const movePin = useMovePin();
  const content = useIntlayer("objekt_menu");
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
      {direction === "up" ? <CaretUpIcon data-slot="icon" /> : <CaretDownIcon data-slot="icon" />}
      <MenuLabel>{direction === "up" ? content.move_up.value : content.move_down.value}</MenuLabel>
    </MenuItem>
  );
}

export function ToggleLockMenuItem({
  isLocked = false,
  tokenId,
}: {
  isLocked?: boolean;
  tokenId: string;
}) {
  const profile = useProfileTarget();
  const lock = useBatchLock();
  const unlock = useBatchUnlock();
  const content = useIntlayer("objekt_menu");
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
      <MenuLabel>{isLocked ? content.unlock.value : content.lock.value}</MenuLabel>
    </MenuItem>
  );
}

export function SetPriceMenuItem({ onAction }: { onAction: () => void }) {
  const content = useIntlayer("objekt_menu");
  return (
    <MenuItem onAction={onAction}>
      <CurrencyDollarIcon data-slot="icon" />
      <MenuLabel>{content.set_price.value}</MenuLabel>
    </MenuItem>
  );
}

export function SelectMenuItem({ objekts }: { objekts: ValidObjekt[] }) {
  const [objekt] = objekts as [ValidObjekt];
  const objektSelect = useObjektSelect((a) => a.select);
  const isSelected = useObjektSelect((state) => state.isSelected(objekt));
  const content = useIntlayer("objekt_menu");
  return (
    <MenuItem onAction={() => objektSelect(objekts)}>
      <CheckIcon data-slot="icon" />
      <MenuLabel>{isSelected ? content.unselect.value : content.select.value}</MenuLabel>
    </MenuItem>
  );
}
