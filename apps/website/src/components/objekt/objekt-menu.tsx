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
import { type PropsWithChildren } from "react";

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
import { useUserLists } from "@/hooks/use-user";
import { parseNickname } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { Button } from "../intentui/button";
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
  const lists = useUserLists();
  const addToList = useAddToList();
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
        <PlusIcon />
        <MenuLabel>{m.objekt_menu_add_to_list()}</MenuLabel>
      </MenuItem>
      <MenuContent placement="bottom right" popover={{ offset: -2 }}>
        {availableLists.length === 0 && (
          <MenuItem isDisabled>
            <MenuLabel>
              <span>{m.objekt_menu_no_list_found()}</span>
            </MenuLabel>
          </MenuItem>
        )}
        {availableLists.map((a) => (
          <MenuItem key={a.slug} onAction={() => handleAction(a.slug, a.listType)}>
            <MenuLabel>
              {a.name}{" "}
              {a.profile && (
                <span className="text-muted-fg text-xs">
                  ({parseNickname(a.profile.address, a.profile.nickname)})
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
  const target = useListTarget()!;
  const removeObjektsFromList = useRemoveFromList();

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
      <TrashSimpleIcon />
      <MenuLabel>{m.objekt_menu_remove_from_list()}</MenuLabel>
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
  const profile = useProfileTarget()!;
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
      {isPin ? <PushPinSlashIcon /> : <PushPinIcon />}
      <MenuLabel>{isPin ? m.objekt_menu_unpin() : m.objekt_menu_pin()}</MenuLabel>
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
  const profile = useProfileTarget()!;
  const movePin = useMovePin();
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
      {direction === "up" ? <CaretUpIcon /> : <CaretDownIcon />}
      <MenuLabel>
        {direction === "up" ? m.objekt_menu_move_up() : m.objekt_menu_move_down()}
      </MenuLabel>
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
  const profile = useProfileTarget()!;
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
      {isLocked ? <LockSimpleOpenIcon /> : <LockSimpleIcon />}
      <MenuLabel>{isLocked ? m.objekt_menu_unlock() : m.objekt_menu_lock()}</MenuLabel>
    </MenuItem>
  );
}

export function SetPriceMenuItem({ onAction }: { onAction: () => void }) {
  return (
    <MenuItem onAction={onAction}>
      <CurrencyDollarIcon />
      <MenuLabel>{m.objekt_menu_set_price()}</MenuLabel>
    </MenuItem>
  );
}

export function SelectMenuItem({ objekts }: { objekts: ValidObjekt[] }) {
  const [objekt] = objekts as [ValidObjekt];
  const objektSelect = useObjektSelect((a) => a.select);
  const isSelected = useObjektSelect((state) => state.isSelected(objekt));
  return (
    <MenuItem onAction={() => objektSelect(objekts)}>
      <CheckIcon />
      <MenuLabel>{isSelected ? m.objekt_menu_unselect() : m.objekt_menu_select()}</MenuLabel>
    </MenuItem>
  );
}
