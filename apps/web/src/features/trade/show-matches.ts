import { canBeOnTrade, type PublicList } from "@repo/api/schemas/list";

/** Someone else's list on Trade, for a signed-in viewer: the only page with matches to show. */
export function canShowMatches(
  list: Pick<PublicList, "discoverable" | "listType" | "isProfileBind">,
  signedIn: boolean,
  owner: boolean,
) {
  return (
    signedIn &&
    !owner &&
    list.discoverable === true &&
    list.listType !== "general" &&
    canBeOnTrade(list.listType, list.isProfileBind)
  );
}
