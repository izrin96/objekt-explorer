import { PlusIcon, TrashSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useState } from "react";

import type { ButtonProps } from "@/components/intentui/button";
import { Button } from "@/components/intentui/button";
import { MenuItem, MenuLabel, MenuSubMenu, MenuContent } from "@/components/intentui/menu";
import { AddToListModal } from "@/components/list/modal/add-to-list-modal";
import { RemoveFromListModal } from "@/components/list/modal/remove-from-list-modal";
import { ListLabel } from "@/components/shared/list-label";
import { useAddToList } from "@/hooks/actions/add-to-list";
import { useRemoveFromList } from "@/hooks/actions/remove-from-list";
import { useListTarget } from "@/hooks/use-list-target";
import { useObjektSelect } from "@/hooks/use-objekt-select";
import { useUserLists } from "@/hooks/use-user";
import { isObjektOwned } from "@/lib/objekt-utils";
import { m } from "@/paraglide/messages";

// --- Buttons ---

export function AddToList({ size, address }: { size?: ButtonProps["size"]; address?: string }) {
  const [addOpen, setAddOpen] = useState(false);
  const handleAction = useObjektSelect((a) => a.handleAction);
  return (
    <>
      <AddToListModal open={addOpen} setOpen={setAddOpen} address={address} />
      <Button size={size} intent="outline" onPress={() => handleAction(() => setAddOpen(true))}>
        <PlusIcon weight="regular" />
        {m.filter_add_to_list()}
      </Button>
    </>
  );
}

export function RemoveFromList({ size }: { size?: ButtonProps["size"] }) {
  const [open, setOpen] = useState(false);
  const handleAction = useObjektSelect((a) => a.handleAction);
  return (
    <>
      <RemoveFromListModal open={open} setOpen={setOpen} />
      <Button size={size} intent="outline" onPress={() => handleAction(() => setOpen(true))}>
        <TrashSimpleIcon weight="regular" />
        {m.filter_remove_from_list()}
      </Button>
    </>
  );
}

// --- Menu items ---

export function AddToListMenu({ objekts, address }: { objekts: ValidObjekt[]; address?: string }) {
  const lists = useUserLists();
  const addToList = useAddToList();
  const availableLists = lists?.filter((list) => {
    if (address) {
      return (
        !list.isProfileBind || (list.isProfileBind && list.profileAddress === address.toLowerCase())
      );
    } else {
      return !list.isProfileBind;
    }
  });

  const handleAction = (slug: string, isProfileBind: boolean) => {
    addToList.mutate({
      slug: slug,
      skipDups: false,
      objekts: isProfileBind ? objekts.filter(isObjektOwned).map((a) => a.tokenId) : undefined,
      collectionSlugs: !isProfileBind ? objekts.map((a) => a.slug) : undefined,
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
        {availableLists.map((list) => (
          <MenuItem key={list.slug} onAction={() => handleAction(list.slug, list.isProfileBind)}>
            <MenuLabel>
              <ListLabel list={list} />
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
          entryIds: objekts.map((a) => Number(a.id)),
        })
      }
      intent="danger"
    >
      <TrashSimpleIcon />
      <MenuLabel>{m.objekt_menu_remove_from_list()}</MenuLabel>
    </MenuItem>
  );
}
