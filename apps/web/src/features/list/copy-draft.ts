import type { ListType } from "@repo/api/schemas/list";

import { isSameAddress } from "@/lib/address";
import { m } from "@/paraglide/messages";

import { EMPTY_DRAFT, type ListDraft, type StoredList, isBindable } from "./list-draft";

export type CopySource = Pick<
  StoredList,
  | "name"
  | "description"
  | "listType"
  | "currency"
  | "profileAddress"
  | "isProfileBind"
  | "matchSale"
  | "matchHave"
  | "gridColumns"
  | "hideSerial"
  | "removeOnReceive"
>;

/**
 * The source's own choices, but never its partner or its place on Trade. With `fixedType` the
 * copy takes that type, and keeps only what still fits it.
 */
export function toCopyDraft(
  list: CopySource,
  { fixedType, profiles }: { fixedType?: ListType; profiles: readonly { address: string }[] },
): ListDraft {
  const listType = fixedType ?? list.listType;
  const keepsOpenTo = list.listType === "want" && listType === "want";
  const common = {
    name: m.list_copy_name({ name: list.name }),
    description: list.description ?? "",
    linkedListId: null,
    matchSale: keepsOpenTo ? list.matchSale : EMPTY_DRAFT.matchSale,
    matchHave: keepsOpenTo ? list.matchHave : EMPTY_DRAFT.matchHave,
    gridColumns: list.gridColumns,
    hideSerial: list.hideSerial,
    removeOnReceive: keepsOpenTo ? list.removeOnReceive : EMPTY_DRAFT.removeOnReceive,
    regenerateSlug: false,
    // the server carries the list's ratio when the copy keeps its type
    ratio: null,
  };

  if (fixedType === undefined) {
    return {
      ...common,
      listType,
      currency: list.currency ?? "",
      profileAddress: list.profileAddress,
      isProfileBind: list.isProfileBind,
    };
  }

  const keptProfile = profiles.some((profile) =>
    isSameAddress(profile.address, list.profileAddress),
  );
  return {
    ...common,
    listType,
    currency: list.listType === "sale" ? (list.currency ?? "") : "",
    profileAddress: keptProfile ? list.profileAddress : (profiles[0]?.address ?? null),
    isProfileBind: isBindable(listType),
  };
}
