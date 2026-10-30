import { CheckIcon } from "@phosphor-icons/react";
import type { PublicList } from "@repo/api/schemas/list";
import { Fragment } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectGroup,
  SelectGroupLabel,
  SelectItem,
  SelectPopup,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { m } from "@/paraglide/messages";

import { groupLists } from "./add-to-list-source";
import { ListTypeBadge } from "./list-type-badge";

export function ListPicker({
  lists,
  address,
  value,
  onValueChange,
  isDisabled,
  profileName,
}: {
  lists: PublicList[];
  address: string | undefined;
  value: string | null;
  onValueChange: (slug: string | null) => void;
  isDisabled: (list: PublicList) => boolean;
  profileName: (address: string) => string;
}) {
  const groups = groupLists(lists, address);

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger id="add-to-list" className="min-w-0">
        <SelectValue placeholder={m.list_manage_objekt_list_placeholder()}>
          {(slug: string | null) => {
            const list = lists.find((l) => l.slug === slug);
            return list ? (
              <ListChoice
                list={list}
                profile={
                  list.isProfileBind && list.profileAddress !== null
                    ? profileName(list.profileAddress)
                    : undefined
                }
              />
            ) : (
              m.list_manage_objekt_list_placeholder()
            );
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectPopup>
        {groups.unbound.length > 0 && (
          <SelectGroup>
            <SelectGroupLabel>{m.list_add_group_unbound()}</SelectGroupLabel>
            {groups.unbound.map((list) => (
              <SelectItem key={list.slug} value={list.slug}>
                <ListChoice list={list} />
              </SelectItem>
            ))}
          </SelectGroup>
        )}
        {groups.bound.map((group, i) => (
          <Fragment key={group.address}>
            {(i > 0 || groups.unbound.length > 0) && <SelectSeparator />}
            <SelectGroup>
              <SelectGroupLabel className="flex items-center gap-1.5">
                <CheckIcon weight="bold" className="size-3" aria-hidden />
                {m.list_add_group_bound({ profile: profileName(group.address) })}
              </SelectGroupLabel>
              {group.lists.map((list) => (
                <SelectItem key={list.slug} value={list.slug} disabled={isDisabled(list)}>
                  <ListChoice list={list} ownedOnly={isDisabled(list)} />
                </SelectItem>
              ))}
            </SelectGroup>
          </Fragment>
        ))}
      </SelectPopup>
    </Select>
  );
}

/**
 * A list as the picker draws it: type badge and name. The closed picker also
 * names the profile a bound list follows; in the popup its group heading does.
 */
function ListChoice({
  list,
  profile,
  ownedOnly = false,
}: {
  list: PublicList;
  profile?: string;
  ownedOnly?: boolean;
}) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <ListTypeBadge type={list.listType} className="shrink-0" />
      <span className="truncate">{list.name}</span>
      {profile !== undefined && (
        // a static mark: the Bound badge's tooltip button cannot sit inside an option
        <Badge variant="outline" size="sm" className="max-w-32 min-w-0">
          <CheckIcon weight="bold" className="size-3.5 sm:size-3" aria-hidden />
          <span className="truncate">{profile}</span>
        </Badge>
      )}
      {ownedOnly && (
        <span className="text-muted-foreground shrink-0 text-xs">
          {m.list_manage_objekt_owned_only()}
        </span>
      )}
    </span>
  );
}
