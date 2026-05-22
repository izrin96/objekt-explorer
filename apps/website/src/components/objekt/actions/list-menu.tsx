import { PlusIcon, TrashSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import type { ValidObjekt } from "@repo/lib/types/objekt";

import { MenuItem, MenuLabel, MenuSubMenu, MenuContent } from "@/components/intentui/menu";
import { useAddToList } from "@/hooks/actions/add-to-list";
import { useRemoveFromList } from "@/hooks/actions/remove-from-list";
import { useListTarget } from "@/hooks/use-list-target";
import { useUserLists } from "@/hooks/use-user";
import { parseNickname } from "@/lib/utils";
import { m } from "@/paraglide/messages";

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
