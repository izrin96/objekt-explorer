import type { ListType } from "@repo/api/schemas/list";
import type { OpenToFlags } from "@repo/api/schemas/open-to";
import slugify from "slugify";
import * as z from "zod";

import { displayNickname, isSameAddress } from "@/lib/address";
import { m } from "@/paraglide/messages";

const CURRENCY_RE = /^[A-Za-z]{3}$/;

export type ListDraft = OpenToFlags & {
  name: string;
  description: string;
  listType: ListType;
  currency: string;
  linkedListId: number | null;
  profileAddress: string | null;
  isProfileBind: boolean;
  gridColumns: number | null;
  hideSerial: boolean;
  regenerateSlug: boolean;
};

export const EMPTY_DRAFT: ListDraft = {
  name: "",
  description: "",
  listType: "general",
  currency: "",
  linkedListId: null,
  profileAddress: null,
  isProfileBind: false,
  // a new want list is open to swaps and buying until a post narrows it
  matchSale: true,
  matchHave: true,
  gridColumns: null,
  hideSerial: false,
  regenerateSlug: false,
};

/** Built per submit: the message functions read the request's locale. */
export function listDraftSchema() {
  return z
    .object({
      name: z.string().trim().min(1, m.common_validation_required_name()).max(256),
      description: z.string().max(5000),
      currency: z.string(),
      listType: z.enum(["general", "sale", "have", "want"]),
      profileAddress: z.string().nullable(),
      isProfileBind: z.boolean(),
      linkedListId: z.number().nullable(),
      matchSale: z.boolean(),
      matchHave: z.boolean(),
    })
    .superRefine((draft, ctx) => {
      if (draft.listType === "sale" && !CURRENCY_RE.test(draft.currency)) {
        ctx.addIssue({
          code: "custom",
          path: ["currency"],
          message: m.list_create_currency_invalid(),
        });
      }
      if (draft.isProfileBind && draft.profileAddress === null) {
        ctx.addIssue({
          code: "custom",
          path: ["profileAddress"],
          message: m.list_create_profile_required(),
        });
      }
    });
}

/**
 * `list.create`'s input, normalised the way the router does before it writes: the fields a type
 * does not carry are dropped rather than kept stale. A list starts off Trade, and a have or want
 * list unpaired; the post composer puts it on Trade.
 */
export function toCreateInput(draft: ListDraft) {
  const isProfileBind = ["have", "sale"].includes(draft.listType) && draft.isProfileBind;

  return {
    name: draft.name.trim(),
    description: draft.description.trim() || null,
    currency: draft.listType === "sale" ? draft.currency.toUpperCase() : null,
    listType: draft.listType,
    linkedListId: ["have", "want"].includes(draft.listType) ? draft.linkedListId : null,
    profileAddress: draft.profileAddress,
    isProfileBind,
    matchSale: draft.matchSale,
    matchHave: draft.matchHave,
    hideSerial: draft.hideSerial,
  };
}

/**
 * `list.edit`'s input. A list's link, Trade state and Open to belong to its post, so they are left
 * out and the list keeps them.
 */
export function toEditInput(slug: string, draft: ListDraft) {
  const {
    listType: _type,
    isProfileBind: _bind,
    linkedListId: _link,
    matchSale: _sale,
    matchHave: _have,
    ...rest
  } = toCreateInput(draft);
  return {
    slug,
    ...rest,
    gridColumns: draft.gridColumns,
    regenerateSlug: draft.regenerateSlug,
  };
}

export type ListUrl = { nickname: string; profileSlug: string; fallbackSlug: string };

/** `Select` has no value for "cleared", so the empty choice carries its own. */
export const NONE = "__none__";

export const LIST_TYPES: ListType[] = ["general", "have", "want", "sale"];

export const isListType = (value: unknown): value is ListType =>
  LIST_TYPES.some((type) => type === value);

export const LIST_TYPE_DESC: Record<ListType, () => string> = {
  general: m.list_create_general_list_desc,
  sale: m.list_create_sale_list_desc,
  have: m.list_create_have_list_desc,
  want: m.list_create_want_list_desc,
};

export const isBindable = (type: ListType) => type === "have" || type === "sale";

export function listTypePatch(
  draft: ListDraft,
  next: ListType | null,
  profiles: readonly { address: string }[],
): Pick<ListDraft, "listType" | "linkedListId" | "profileAddress" | "isProfileBind"> {
  const listType = next ?? "general";
  const nextBindable = isBindable(listType);
  // entering have or sale binds by default, to the chosen profile or else
  // the first; moving between the two keeps what the user set
  const entering = nextBindable && !isBindable(draft.listType);
  const profileAddress = entering
    ? (draft.profileAddress ?? profiles[0]?.address ?? null)
    : draft.profileAddress;
  return {
    listType,
    linkedListId: null,
    profileAddress,
    isProfileBind: nextBindable && profileAddress !== null && (entering || draft.isProfileBind),
  };
}

export function profilePatch(
  draft: ListDraft,
  next: string | null,
): Pick<ListDraft, "profileAddress" | "isProfileBind"> {
  const profileAddress = next === null || next === NONE ? null : next;
  return {
    profileAddress,
    isProfileBind: profileAddress === null ? false : draft.isProfileBind,
  };
}

export function profileLabel(
  address: string,
  profiles: readonly { address: string; nickname: string | null }[],
): string {
  return displayNickname(
    address,
    profiles.find((p) => isSameAddress(p.address, address))?.nickname,
  );
}

export function bindNote(
  draft: ListDraft,
  mode: "create" | "edit",
  profileCount: number,
): "link" | "off" | null {
  if (!isBindable(draft.listType) || mode !== "create") return null;
  if (profileCount === 0) return "link";
  return draft.isProfileBind ? null : "off";
}

export function slugPreview(name: string, url: ListUrl, regenerate: boolean): string {
  return regenerate
    ? slugify(name, { lower: true, strict: true }) || url.fallbackSlug
    : url.profileSlug;
}
