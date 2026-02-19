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
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import type { PropsWithChildren } from "react";

import { useAddToList } from "@/hooks/actions/add-to-list";
import { useBatchLock } from "@/hooks/actions/batch-lock";
import { useBatchPin } from "@/hooks/actions/batch-pin";
import { useBatchUnlock } from "@/hooks/actions/batch-unlock";
import { useBatchUnpin } from "@/hooks/actions/batch-unpin";
import { useRemoveFromList } from "@/hooks/actions/remove-from-list";
import { useObjektSelect } from "@/hooks/use-objekt-select";
import { useTarget } from "@/hooks/use-target";
import { orpc } from "@/lib/orpc/client";

import { Button } from "../ui/button";
import { Loader } from "../ui/loader";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSubMenu } from "../ui/menu";

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

export function AddToListMenu({ objekt, address }: { objekt: ValidObjekt; address?: string }) {
  const { data: lists } = useQuery(orpc.list.list.queryOptions());
  const addToList = useAddToList();
  const t = useTranslations("objekt_menu");

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
      objekts: listType === "profile" ? [{ objektId: objekt.id }] : undefined,
      collectionSlugs: listType === "normal" ? [objekt.slug] : undefined,
    });
  };

  return (
    <MenuSubMenu>
      <MenuItem>
        <PlusIcon data-slot="icon" />
        <MenuLabel>{t("add_to_list")}</MenuLabel>
      </MenuItem>
      <MenuContent placement="bottom">
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
              <span>{t("no_list_found")}</span>
            </MenuLabel>
          </MenuItem>
        )}
        {availableLists?.map((a) => (
          <MenuItem key={a.slug} onAction={() => handleAction(a.slug, a.listType)}>
            <MenuLabel>{a.name}</MenuLabel>
          </MenuItem>
        ))}
      </MenuContent>
    </MenuSubMenu>
  );
}

export function RemoveFromListMenu({ objekt }: { objekt: ValidObjekt }) {
  const target = useTarget((a) => a.list)!;
  const removeObjektsFromList = useRemoveFromList();
  const t = useTranslations("objekt_menu");

  return (
    <MenuItem
      onAction={() =>
        removeObjektsFromList.mutate({
          slug: target.slug,
          ids: [Number(objekt.id)],
        })
      }
      intent="danger"
    >
      <TrashSimpleIcon data-slot="icon" />
      <MenuLabel>{t("remove_from_list")}</MenuLabel>
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
  const profile = useTarget((a) => a.profile)!;
  const pin = useBatchPin();
  const unpin = useBatchUnpin();
  const t = useTranslations("objekt_menu");
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
      <MenuLabel>{isPin ? t("unpin") : t("pin")}</MenuLabel>
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
  const profile = useTarget((a) => a.profile)!;
  const lock = useBatchLock();
  const unlock = useBatchUnlock();
  const t = useTranslations("objekt_menu");
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
      <MenuLabel>{isLocked ? t("unlock") : t("lock")}</MenuLabel>
    </MenuItem>
  );
}

export function SelectMenuItem({ objekt }: { objekt: ValidObjekt }) {
  const objektSelect = useObjektSelect((a) => a.select);
  const isSelected = useObjektSelect((state) => state.isSelected(objekt));
  const t = useTranslations("objekt_menu");
  return (
    <MenuItem onAction={() => objektSelect(objekt)}>
      <CheckIcon data-slot="icon" />
      <MenuLabel>{isSelected ? t("unselect") : t("select")}</MenuLabel>
    </MenuItem>
  );
}
