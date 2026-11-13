import { type CandidateItem, OFFER_SIDE_LIMIT } from "@repo/api/schemas/offer";

import { type OfferPick, anyKey, pickKey, toPick } from "./pick";
import { anyTop, copiesLeft, countOf, totalOf } from "./quantity";

type Selection = ReadonlyMap<string, OfferPick>;

/** One picker tile: every copy of one collection the picker shows. */
export type CopyGroup = {
  slug: string;
  /** copies shown by serial, ascending; unavailable ones keep their place */
  shown: CandidateItem[];
  any: CandidateItem | null;
  /** list slugs the group's items come from, in the partner's list order */
  lists: string[];
  /** the ratio every item shares, else null */
  ratio: number | null;
};

const sendable = (item: CandidateItem) => item.transferable && !item.reserved;

/** The copies of an any item no shown serial stands for. */
const hiddenOf = (any: CandidateItem | null) =>
  any === null ? 0 : (any.hidden ?? (any.bySerial ? 0 : (any.copies ?? 0)));

const serialRank = (item: CandidateItem) => item.serial ?? Infinity;

/**
 * The picker's items as groups, in the order their collections first appear. `listOrder` is the
 * partner's lists in order, which each group's `lists` follow; a slug not in it goes last, in the
 * order seen. Without it (You give, a collection) the lists keep the order seen.
 */
export function groupItems(
  items: readonly CandidateItem[],
  listOrder: readonly { slug: string }[] = [],
): CopyGroup[] {
  const rank = (slug: string) => {
    const at = listOrder.findIndex((list) => list.slug === slug);
    return at === -1 ? Infinity : at;
  };
  const bySlug = new Map<string, CandidateItem[]>();
  for (const item of items) {
    const group = bySlug.get(item.collectionSlug);
    if (group) group.push(item);
    else bySlug.set(item.collectionSlug, [item]);
  }
  return [...bySlug].map(([slug, own]) => {
    const lists = [
      ...new Set(own.flatMap((item) => (item.listSlug === null ? [] : [item.listSlug]))),
    ].toSorted((a, b) => (rank(a) === rank(b) ? 0 : rank(a) < rank(b) ? -1 : 1));
    const ratio = own[0]?.ratio;
    return {
      slug,
      shown: own
        .filter((item) => item.objektId !== null)
        .toSorted((a, b) => serialRank(a) - serialRank(b)),
      any: own.find((item) => item.objektId === null) ?? null,
      lists,
      ratio: ratio !== undefined && own.every((item) => item.ratio === ratio) ? ratio : null,
    };
  });
}

const availableShown = (group: CopyGroup) => group.shown.filter(sendable);

/** The copies a group offers: available shown copies and those only Any serial reaches. */
const countOfGroup = (group: CopyGroup) => availableShown(group).length + hiddenOf(group.any);

/**
 * The collection's any pick came through a list this group does not show (the picker narrowed to
 * one list or post). One pick per collection can ask for any copy, so the group leaves it alone:
 * it neither counts it nor offers Any serial over it.
 */
export function anyElsewhere(group: CopyGroup, selection: Selection) {
  const slug = selection.get(anyKey(group.slug))?.listSlug ?? null;
  return slug !== null && !group.lists.includes(slug);
}

const anyHeld = (group: CopyGroup, selection: Selection) =>
  group.any && !anyElsewhere(group, selection)
    ? countOf(selection.get(anyKey(group.slug)) ?? { count: 0 })
    : 0;

/** Picks of the group's copies plus its any count. */
function pickedOf(group: CopyGroup, selection: Selection) {
  let picked = anyHeld(group, selection);
  for (const item of group.shown) if (selection.has(pickKey(item))) picked += 1;
  return picked;
}

export type TileLine =
  | { kind: "choose"; count: number }
  | { kind: "picked"; picked: number; count: number }
  | { kind: "all"; count: number }
  | { kind: "none" }
  | { kind: "cantOffer"; count: number }
  | { kind: "more"; count: number }
  | { kind: "anyAvailable"; count: number }
  /** the one copy's serial; its flag is the item's own */
  | { kind: "serial"; item: CandidateItem };

export type Tile = {
  kind: "toggle" | "count" | "dialog";
  lines: TileLine[];
  /** a check, or how many are picked */
  mark: "check" | number | null;
  disabled: boolean;
  /** a tile for one copy carries that copy's ratio, any other the one its group shares */
  ratio: number | null;
};

/**
 * What a tile does and shows. `room` is the side's free places (its limit less every pick).
 * A single copy toggles at once, unless an any pick is held or hidden copies stand beside it.
 */
export function tileOf(group: CopyGroup, selection: Selection, room: number): Tile {
  const picked = pickedOf(group, selection);
  const full = room <= 0;
  const hidden = hiddenOf(group.any);
  const held = anyHeld(group, selection);

  if (group.shown.length === 0) {
    const count = hidden > 0 ? hidden : (group.any?.copies ?? 0);
    return {
      kind: "count",
      lines: [{ kind: "anyAvailable", count }],
      mark: held > 0 ? "check" : null,
      disabled: held === 0 && (full || count === 0),
      ratio: group.ratio,
    };
  }

  const single = group.shown[0]!;
  if (group.shown.length === 1 && hidden === 0 && held === 0) {
    return {
      kind: "toggle",
      lines: [{ kind: "serial", item: single }],
      mark: picked > 0 ? "check" : null,
      disabled: !sendable(single) || (picked === 0 && full),
      ratio: single.ratio ?? null,
    };
  }

  const available = availableShown(group).length;
  const count = available + hidden;
  const lines: TileLine[] = [];
  if (picked > 0) {
    lines.push(picked >= count ? { kind: "all", count } : { kind: "picked", picked, count });
  } else if (available > 0) lines.push({ kind: "choose", count: available });
  else if (hidden > 0) lines.push({ kind: "anyAvailable", count: hidden });
  else lines.push({ kind: "none" });
  if (hidden > 0 && available > 0) lines.push({ kind: "more", count: hidden });
  const cantOffer = group.shown.length - available;
  if (cantOffer > 0) lines.push({ kind: "cantOffer", count: cantOffer });
  return {
    kind: "dialog",
    lines,
    mark: picked > 0 ? picked : null,
    disabled: picked === 0 && full,
    ratio: group.ratio,
  };
}

export type AnyControl =
  | { kind: "none" }
  /** copies only Any serial reaches, or a count held above one: 0 to `top`; `available` is the top before the room cuts it */
  | { kind: "count"; value: number; top: number; available: number }
  /** shown copies only: worth one copy; disabled once every serial is picked */
  | { kind: "checkbox"; checked: boolean; disabled: boolean };

/** The picks the dialog's any count is bounded by: the selection as it is once `draft` is applied. */
export function draftedTop(group: CopyGroup, draft: Selection, selection: Selection) {
  return group.any ? anyTop(group.any, applyGroup(selection, group, draft).values()) : 0;
}

/**
 * The dialog's Any serial control for `draft` (the group's picks), within `room`, the places the
 * dialog may fill. An unchecked checkbox is disabled with no room, a checked one stays so it can be
 * unchecked, and a count's top stops at the room, never below the count held. The copies Any serial
 * may take count the serials of the collection `selection` holds through another list as well.
 */
export function anyControlOf(
  group: CopyGroup,
  draft: Selection,
  room: number,
  selection: Selection,
): AnyControl {
  const { any } = group;
  if (!any || anyElsewhere(group, selection)) return { kind: "none" };
  const value = anyHeld(group, draft);
  const free = room - totalOf(draft.values());
  const top = draftedTop(group, draft, selection);
  if (hiddenOf(any) > 0 || value > 1) {
    return {
      kind: "count",
      value,
      top: Math.max(value, Math.min(top, value + free)),
      available: top,
    };
  }
  if (availableShown(group).length >= 2 || value > 0) {
    return {
      kind: "checkbox",
      checked: value > 0,
      disabled: value === 0 && (top === 0 || free <= 0),
    };
  }
  return { kind: "none" };
}

/** The keys the group's picks sit under in `selection`: its copies, and the any pick unless another list holds it. */
const groupKeys = (group: CopyGroup, selection: Selection) => [
  ...group.shown.map(pickKey),
  ...(group.any && !anyElsewhere(group, selection) ? [anyKey(group.slug)] : []),
];

/** A shown-only any pick leaves once every copy is picked by serial, which the server would refuse. */
function settle(group: CopyGroup, draft: Selection): Map<string, OfferPick> {
  const next = new Map(draft);
  const any = group.any;
  if (
    any &&
    hiddenOf(any) === 0 &&
    countOf(next.get(anyKey(group.slug)) ?? { count: 0 }) === 1 &&
    copiesLeft(next.values(), group.slug, any.copies ?? 1) === 0
  ) {
    next.delete(anyKey(group.slug));
  }
  return next;
}

/** The group's own picks in `selection`: where a dialog's draft starts. */
export function draftOf(group: CopyGroup, selection: Selection) {
  const keys = new Set(groupKeys(group, selection));
  return new Map([...selection].filter(([key]) => keys.has(key)));
}

/** Places the dialog may fill: the side's limit less every pick that is not the group's. */
export function dialogRoom(group: CopyGroup, selection: Selection) {
  const keys = new Set(groupKeys(group, selection));
  const others = [...selection].filter(([key]) => !keys.has(key)).map(([, pick]) => pick);
  return OFFER_SIDE_LIMIT - totalOf(others);
}

/** The shown-only Any serial checkbox ticked or unticked. */
export function toggleAny(group: CopyGroup, draft: Selection) {
  const any = group.any;
  const next = new Map(draft);
  if (!any) return next;
  const key = anyKey(group.slug);
  if (next.has(key)) next.delete(key);
  else next.set(key, toPick(any));
  return next;
}

/** Select all has a row left to check and room to check it in. */
export function canSelectAll(group: CopyGroup, draft: Selection, room: number) {
  return (
    totalOf(draft.values()) < room &&
    availableShown(group).some((item) => !draft.has(pickKey(item)))
  );
}

/** A row checked or unchecked. */
export function toggleCopy(group: CopyGroup, draft: Selection, item: CandidateItem) {
  const key = pickKey(item);
  const next = new Map(draft);
  if (next.has(key)) next.delete(key);
  else next.set(key, toPick(item));
  return settle(group, next);
}

/** Rows name their list only when the copies they show come from more than one. */
export function rowsNameLists(group: CopyGroup) {
  return (
    new Set(group.shown.flatMap((item) => (item.listSlug === null ? [] : [item.listSlug]))).size > 1
  );
}

export type Row = { checked: boolean; disabled: boolean };

/** A row: unavailable copies and, at the room, unchecked ones can't be checked. */
export function rowOf(item: CandidateItem, draft: Selection, room: number): Row {
  const checked = draft.has(pickKey(item));
  return { checked, disabled: !sendable(item) || (!checked && totalOf(draft.values()) >= room) };
}

/** Every available row not yet checked, in order, until `room` is used; the any control stays. */
export function selectAll(group: CopyGroup, draft: Selection, room: number) {
  const next = new Map(draft);
  let left = room - totalOf(next.values());
  for (const item of availableShown(group)) {
    if (left <= 0) break;
    const key = pickKey(item);
    if (next.has(key)) continue;
    next.set(key, toPick(item));
    left -= 1;
  }
  return settle(group, next);
}

/** The draft without any of the group's copies or its any pick. */
export function clearGroup(group: CopyGroup, draft: Selection) {
  const next = new Map(draft);
  for (const key of groupKeys(group, draft)) next.delete(key);
  return next;
}

/** The selection with the group's copies and its any pick replaced by the draft's. */
export function applyGroup(selection: Selection, group: CopyGroup, draft: Selection) {
  const keys = new Set(groupKeys(group, selection));
  const next = new Map([...selection].filter(([key]) => !keys.has(key)));
  for (const [key, pick] of draft) if (keys.has(key)) next.set(key, pick);
  return next;
}

/** The dialog's footer: the draft's picks, and the side's total with them in place of the saved ones. */
export function dialogFooter(group: CopyGroup, draft: Selection, room: number) {
  const picked = pickedOf(group, draft);
  return {
    picked,
    available: countOfGroup(group),
    sideTotal: OFFER_SIDE_LIMIT - room + totalOf(draft.values()),
    full: totalOf(draft.values()) >= room,
  };
}

export type Confirm = { kind: "pick"; count: number } | { kind: "remove" } | { kind: "idle" };

/** The confirm button: Pick 1 copy / Pick N copies, Remove all, or a disabled Pick copies. */
export function confirmOf(group: CopyGroup, draft: Selection, selection: Selection): Confirm {
  const picked = pickedOf(group, draft);
  if (picked > 0) return { kind: "pick", count: picked };
  return pickedOf(group, selection) > 0 ? { kind: "remove" } : { kind: "idle" };
}
