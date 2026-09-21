import { create } from "zustand";

import { SEED } from "@/store/lists-seed";

/** mirrors `listTypeNew` on the app's `PublicList`; the array is the form's option order */
export const LIST_TYPES = ["general", "have", "want", "sale"] as const;
export type ListType = (typeof LIST_TYPES)[number];

/** one row of the app's `listEntries` join table */
export type ListEntry = {
  /** `LabObjekt.id` — a collection slug on every lab surface */
  objektId: string;
  /** asking price in the list's currency; only `sale` lists carry one */
  price?: number;
};

export type LabList = {
  id: string;
  name: string;
  type: ListType;
  /** ISO 4217 code, only meaningful for `sale` lists; empty when unset */
  currency: string;
  description: string;
  /** id of the complementary Have/Want list this one is paired with */
  linkedListId: string | null;
  /**
   * nickname of the Cosmo profile this list belongs to; the lab's stand-in for
   * the app's `lists.profileAddress`. Set on its own it only files the list
   * under that Cosmo — `isProfileBind` decides whether the profile shows it.
   */
  profileNickname: string | null;
  /**
   * the app's `lists.is_profile_bind`: whether the profile's Lists tab displays
   * this list. Only meaningful while `profileNickname` is set.
   */
  isProfileBind: boolean;
  isPublic: boolean;
  entries: ListEntry[];
  /** the app's `lists.updatedAt`; every mutation retouches it */
  updatedAt: Date;
  /** offset into the objekt fixtures, for the card's stacked thumbnails */
  start: number;
};

export const LIST_TYPE_LABEL: Record<ListType, string> = {
  general: "General",
  have: "Have",
  want: "Want",
  sale: "Sale",
};

/** `list_create_*_list_desc` in `apps/website/messages/en.json` */
export const LIST_TYPE_DESC: Record<ListType, string> = {
  general: "Collection-based list for organizing objekts.",
  have: "Track objekts you own. Can be paired with a Want list.",
  want: "Track objekts you want. Can be paired with a Have list.",
  sale: "List for selling objekts with pricing. Requires currency.",
};

export const LIST_TYPE_VARIANT: Record<ListType, "secondary" | "success" | "warning" | "info"> = {
  general: "secondary",
  have: "success",
  want: "warning",
  sale: "info",
};

/** the app slugifies the name and suffixes on collision; same rule here */
function listId(name: string, taken: LabList[]): string {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "list";
  let id = base;
  for (let n = 2; taken.some((l) => l.id === id); n++) id = `${base}-${n}`;
  return id;
}

/** what the list form collects; everything else is derived */
export type NewList = Pick<
  LabList,
  | "name"
  | "type"
  | "currency"
  | "description"
  | "linkedListId"
  | "profileNickname"
  | "isProfileBind"
  | "isPublic"
>;

export const EMPTY_LIST: NewList = {
  name: "",
  type: "general",
  currency: "",
  description: "",
  linkedListId: null,
  profileNickname: null,
  isProfileBind: false,
  isPublic: true,
};

type ListsState = {
  lists: LabList[];
  /** returns the id the new list got, so the caller can link to it */
  create: (draft: NewList) => string;
  update: (id: string, patch: Partial<LabList>) => void;
  remove: (id: string) => void;
  /** appends the objekts the list does not already hold; returns how many landed */
  addEntries: (id: string, objektIds: string[]) => number;
  removeEntries: (id: string, objektIds: string[]) => void;
  /** `null` clears the price back to unset */
  setPrices: (id: string, objektIds: string[], price: number | null) => void;
};

/** every mutation retouches the list, the way the app's `updatedAt` column does */
function patchList(lists: LabList[], id: string, entries: ListEntry[]): LabList[] {
  return lists.map((l) => (l.id === id ? { ...l, entries, updatedAt: new Date() } : l));
}

export const useLists = create<ListsState>((set, get) => ({
  lists: SEED,
  create: (draft) => {
    const id = listId(draft.name, get().lists);
    set((s) => ({
      lists: [
        ...s.lists,
        {
          id,
          name: draft.name,
          type: draft.type,
          currency: draft.currency,
          description: draft.description,
          linkedListId: draft.linkedListId,
          profileNickname: draft.profileNickname,
          isProfileBind: draft.isProfileBind,
          isPublic: draft.isPublic,
          entries: [],
          updatedAt: new Date(),
          // keeps the stacked thumbnails on a new card different from its neighbours
          start: s.lists.length * 3,
        },
      ],
    }));
    return id;
  },
  update: (id, patch) =>
    set((s) => ({
      lists: s.lists.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    })),
  remove: (id) => set((s) => ({ lists: s.lists.filter((l) => l.id !== id) })),
  addEntries: (id, objektIds) => {
    const list = get().lists.find((l) => l.id === id);
    if (!list) return 0;
    const held = new Set(list.entries.map((e) => e.objektId));
    const added = objektIds.filter((objektId) => !held.has(objektId));
    if (added.length === 0) return 0;
    set((s) => ({
      lists: patchList(s.lists, id, [...list.entries, ...added.map((objektId) => ({ objektId }))]),
    }));
    return added.length;
  },
  removeEntries: (id, objektIds) => {
    const drop = new Set(objektIds);
    set((s) => {
      const list = s.lists.find((l) => l.id === id);
      if (!list) return s;
      return {
        lists: patchList(
          s.lists,
          id,
          list.entries.filter((e) => !drop.has(e.objektId)),
        ),
      };
    });
  },
  setPrices: (id, objektIds, price) => {
    const targets = new Set(objektIds);
    set((s) => {
      const list = s.lists.find((l) => l.id === id);
      if (!list) return s;
      const entries = list.entries.map((entry) =>
        targets.has(entry.objektId)
          ? price === null
            ? { objektId: entry.objektId }
            : { objektId: entry.objektId, price }
          : entry,
      );
      return { lists: patchList(s.lists, id, entries) };
    });
  },
}));
