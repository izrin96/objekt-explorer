import { narrowViewer, nearOf, pickerTags } from "../../../lib/trade-feed";
import { addressesByUser } from "../../../lib/trade-rank";
import { type Sides } from "../matches";
import { fetchAddresses } from "../matches/holdings";
import { fetchPostEntries } from "./entries";
import { listedTradeLists } from "./shared";
import { fetchViewer } from "./viewer";

/**
 * A person's near matches to the viewer, as their strips show them: for each of their lists on
 * Trade, or only those `listIds` names, its role, verb and collections, with the viewer's lists
 * behind each. `sides` narrows the viewer to Compare with's lists.
 */
export async function personNear(
  viewerId: string,
  personId: string,
  sides: Sides | null,
  listIds?: ReadonlySet<number>,
) {
  const tradeLists = (await listedTradeLists(viewerId, personId)).filter(
    (list) => !listIds || listIds.has(list.id),
  );
  if (tradeLists.length === 0) return [];
  // the entries wait for the addresses only, not for the viewer's reads
  const [entriesOf, viewer] = await Promise.all([
    fetchAddresses([personId]).then((rows) => fetchPostEntries(tradeLists, addressesByUser(rows))),
    fetchViewer(viewerId),
  ]);
  const narrowed = sides ? narrowViewer(viewer, sides) : viewer;
  return tradeLists.flatMap((list) => {
    const near = nearOf(list.listType, list, entriesOf.get(list.id) ?? [], narrowed);
    return near ? [{ listId: list.id, role: list.listType, ...near }] : [];
  });
}

/**
 * The offer picker's tags for the viewer's copies, giving (against the person's want lists), or
 * the person's, asking (against their have and sale lists), by `pickerTags`.
 */
export async function pickerTagsFor(
  viewerId: string,
  personId: string,
  direction: "give" | "get",
  slugs: readonly string[],
) {
  if (slugs.length === 0) return {};
  const sideLists = (await listedTradeLists(viewerId, personId)).filter(
    (list) => (list.listType === "want") === (direction === "give"),
  );
  if (sideLists.length === 0) return {};
  // the entries wait for the addresses only, not for the viewer's reads
  const [entriesOf, viewer] = await Promise.all([
    fetchAddresses([personId]).then((rows) => fetchPostEntries(sideLists, addressesByUser(rows))),
    fetchViewer(viewerId),
  ]);
  return pickerTags(
    slugs,
    sideLists.map((list) => ({
      role: list.listType,
      list,
      entries: (entriesOf.get(list.id) ?? []).filter((entry) => entry.ruleId === undefined),
    })),
    viewer,
    direction,
  );
}
