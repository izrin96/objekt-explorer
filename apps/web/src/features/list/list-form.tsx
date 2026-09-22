import type { ListTypeNew, PublicList } from "@repo/api/schemas/list";
import * as z from "zod";

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SITE_NAME, validColumns } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { LIST_TYPE_LABEL } from "./list-type-badge";

/** `Select` has no value for "cleared", so the empty choice carries its own. */
const NONE = "__none__";
const CURRENCY_RE = /^[A-Za-z]{3}$/;

const LIST_TYPES: ListTypeNew[] = ["general", "have", "want", "sale"];

const LIST_TYPE_DESC: Record<ListTypeNew, () => string> = {
  general: m.list_create_general_list_desc,
  sale: m.list_create_sale_list_desc,
  have: m.list_create_have_list_desc,
  want: m.list_create_want_list_desc,
};

export type ListDraft = {
  name: string;
  description: string;
  listTypeNew: ListTypeNew;
  currency: string;
  linkedListId: number | null;
  profileAddress: string | null;
  isProfileBind: boolean;
  discoverable: boolean;
  gridColumns: number | null;
  hideSerial: boolean;
  hideUser: boolean;
};

export const EMPTY_DRAFT: ListDraft = {
  name: "",
  description: "",
  listTypeNew: "general",
  currency: "",
  linkedListId: null,
  profileAddress: null,
  isProfileBind: false,
  discoverable: false,
  gridColumns: null,
  hideSerial: false,
  hideUser: false,
};

/** Built per submit: the message functions read the request's locale. */
export function listDraftSchema() {
  return z
    .object({
      name: z.string().trim().min(1, m.common_validation_required_name()).max(256),
      description: z.string().max(5000),
      currency: z.string(),
      listTypeNew: z.enum(["general", "sale", "have", "want"]),
      profileAddress: z.string().nullable(),
      isProfileBind: z.boolean(),
    })
    .superRefine((draft, ctx) => {
      if (draft.listTypeNew === "sale" && !CURRENCY_RE.test(draft.currency)) {
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
 * `list.create`'s input, normalised the way the router does before it writes:
 * the fields a type does not carry are dropped rather than kept stale.
 */
export function toCreateInput(draft: ListDraft) {
  const isProfileBind = ["have", "sale"].includes(draft.listTypeNew) && draft.isProfileBind;

  return {
    name: draft.name.trim(),
    description: draft.description.trim() || null,
    currency: draft.listTypeNew === "sale" ? draft.currency.toUpperCase() : null,
    listTypeNew: draft.listTypeNew,
    linkedListId: ["have", "want"].includes(draft.listTypeNew) ? draft.linkedListId : null,
    profileAddress: draft.profileAddress,
    isProfileBind,
    discoverable: draft.discoverable,
    hideSerial: draft.hideSerial,
    hideUser: draft.hideUser,
  };
}

export function toEditInput(slug: string, draft: ListDraft) {
  const { listTypeNew: _type, isProfileBind: _bind, ...rest } = toCreateInput(draft);
  return { slug, ...rest, gridColumns: draft.gridColumns };
}

type ListFormProps = {
  /** prefixes every field id, so create and edit can be open in one document */
  idPrefix: string;
  value: ListDraft;
  onChange: (next: ListDraft) => void;
  /** the user's other lists, already free of the one being edited */
  lists: PublicList[];
  profiles: { address: string; nickname: string | null }[];
  /** `list.edit` takes neither the type nor the binding, so edit locks both */
  mode: "create" | "edit";
};

export function ListForm({ idPrefix, value, onChange, lists, profiles, mode }: ListFormProps) {
  const id = (field: string) => `${idPrefix}-${field}`;
  const set = (patch: Partial<ListDraft>) => onChange({ ...value, ...patch });

  const isEdit = mode === "edit";
  const isSale = value.listTypeNew === "sale";
  const isPaired = value.listTypeNew === "have" || value.listTypeNew === "want";
  const bindable = value.listTypeNew === "have" || isSale;
  const linkable = lists.filter((list) =>
    value.listTypeNew === "have" ? list.listTypeNew === "want" : list.listTypeNew === "have",
  );
  const discoverableDisabled = value.listTypeNew !== "want" && !value.isProfileBind;

  return (
    <div className="flex flex-col gap-4">
      <Field name="name" className="min-w-0 gap-1.5">
        <FieldLabel htmlFor={id("name")}>{m.list_create_name_label()}</FieldLabel>
        <Input
          id={id("name")}
          autoFocus
          aria-required
          maxLength={256}
          placeholder={m.list_create_name_placeholder()}
          value={value.name}
          onChange={(event) => set({ name: event.target.value })}
        />
        <FieldError />
      </Field>

      <Field name="description" className="min-w-0 gap-1.5">
        <FieldLabel htmlFor={id("description")}>{m.list_create_description_label()}</FieldLabel>
        <Textarea
          id={id("description")}
          rows={3}
          placeholder={m.list_create_description_placeholder()}
          value={value.description}
          onChange={(event) => set({ description: event.target.value })}
        />
      </Field>

      {/* minmax(0,…) on both tracks, or the currency column is sized by the
          type trigger's intrinsic width and the row overflows the dialog */}
      <div
        className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 data-currency:grid-cols-[minmax(0,1fr)_minmax(0,6.5rem)]"
        data-currency={isSale || undefined}
      >
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor={id("type")}>{m.list_create_list_type_label()}</Label>
          <Select
            value={value.listTypeNew}
            disabled={isEdit}
            onValueChange={(next: ListTypeNew | null) =>
              set({ listTypeNew: next ?? "general", linkedListId: null })
            }
          >
            <SelectTrigger id={id("type")} className="min-w-0">
              <SelectValue>{(type: ListTypeNew) => LIST_TYPE_LABEL[type]()}</SelectValue>
            </SelectTrigger>
            <SelectPopup>
              {LIST_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {LIST_TYPE_LABEL[type]()}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
          <span className="text-muted-foreground text-xs text-pretty">
            {LIST_TYPE_DESC[value.listTypeNew]()}
          </span>
        </div>

        {isSale ? (
          <Field name="currency" className="min-w-0 gap-1.5">
            <FieldLabel htmlFor={id("currency")}>{m.list_create_currency_label()}</FieldLabel>
            <Input
              id={id("currency")}
              aria-required
              maxLength={3}
              placeholder="USD"
              className="min-w-0 uppercase"
              value={value.currency}
              onChange={(event) => set({ currency: event.target.value.toUpperCase() })}
            />
            <FieldDescription>{m.list_create_currency_desc()}</FieldDescription>
            <FieldError />
          </Field>
        ) : null}
      </div>

      {isPaired ? (
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor={id("linked")}>{m.list_create_link_list_label()}</Label>
          <Select
            value={value.linkedListId === null ? NONE : String(value.linkedListId)}
            onValueChange={(next: string | null) =>
              set({ linkedListId: next === null || next === NONE ? null : Number(next) })
            }
          >
            <SelectTrigger id={id("linked")} className="min-w-0">
              <SelectValue>
                {(next: string) =>
                  next === NONE
                    ? m.common_form_none()
                    : (linkable.find((list) => String(list.id) === next)?.name ??
                      m.common_form_none())
                }
              </SelectValue>
            </SelectTrigger>
            <SelectPopup>
              <SelectItem value={NONE}>{m.common_form_none()}</SelectItem>
              {linkable.map((list) => (
                <SelectItem key={list.id} value={String(list.id)}>
                  <span className="truncate">{list.name}</span>
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
          <span className="text-muted-foreground text-xs text-pretty">
            {m.list_create_link_list_desc()}
          </span>
        </div>
      ) : null}

      <Field name="profileAddress" className="min-w-0 gap-1.5">
        <FieldLabel htmlFor={id("profile")}>{m.list_create_profile_label()}</FieldLabel>
        <Select
          value={value.profileAddress ?? NONE}
          disabled={isEdit && value.isProfileBind}
          onValueChange={(next: string | null) => {
            const profileAddress = next === null || next === NONE ? null : next;
            set({
              profileAddress,
              isProfileBind: profileAddress === null ? false : value.isProfileBind,
            });
          }}
        >
          <SelectTrigger id={id("profile")} className="min-w-0">
            <SelectValue placeholder={m.list_create_profile_placeholder()}>
              {(next: string) =>
                next === NONE
                  ? m.common_form_none()
                  : (profiles.find((profile) => profile.address === next)?.nickname ?? next)
              }
            </SelectValue>
          </SelectTrigger>
          <SelectPopup>
            <SelectItem value={NONE}>{m.common_form_none()}</SelectItem>
            {profiles.map((profile) => (
              <SelectItem key={profile.address} value={profile.address}>
                {profile.nickname ?? profile.address}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
        <FieldDescription>
          {value.isProfileBind
            ? m.list_create_profile_desc()
            : m.list_create_display_profile_desc()}
        </FieldDescription>
        <FieldError />
      </Field>

      {bindable && !isEdit ? (
        <SwitchRow
          id={id("bind")}
          label={m.list_create_profile_bind_label()}
          description={m.list_create_profile_bind_desc()}
          checked={value.isProfileBind}
          disabled={value.profileAddress === null}
          onCheckedChange={(checked) => set({ isProfileBind: checked })}
        />
      ) : null}

      {value.listTypeNew !== "general" ? (
        <SwitchRow
          id={id("discoverable")}
          label={m.list_create_discoverable_label()}
          description={
            value.listTypeNew === "want"
              ? m.list_create_discoverable_want_desc()
              : isSale
                ? m.list_create_discoverable_sale_desc()
                : m.list_create_discoverable_have_desc()
          }
          checked={value.discoverable}
          disabled={discoverableDisabled}
          onCheckedChange={(checked) => set({ discoverable: checked })}
        />
      ) : null}

      {/* a serial only exists on an entry the bound profile owns */}
      {isSale || value.listTypeNew === "have" ? (
        <SwitchRow
          id={id("hide-serial")}
          label={m.list_create_hide_serial_label()}
          description={m.list_create_hide_serial_desc()}
          checked={value.hideSerial}
          disabled={!value.isProfileBind}
          onCheckedChange={(checked) => set({ hideSerial: checked })}
        />
      ) : null}

      <SwitchRow
        id={id("hide-user")}
        label={m.list_create_hide_user_label()}
        description={m.list_create_hide_user_desc({ siteName: SITE_NAME })}
        checked={value.hideUser}
        onCheckedChange={(checked) => set({ hideUser: checked })}
      />

      {isEdit ? (
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor={id("columns")}>{m.list_edit_objekt_columns_label()}</Label>
          <span className="text-muted-foreground text-xs text-pretty">
            {m.list_edit_objekt_columns_desc()}
          </span>
          <Select
            value={value.gridColumns === null ? NONE : String(value.gridColumns)}
            onValueChange={(next: string | null) =>
              set({ gridColumns: next === null || next === NONE ? null : Number(next) })
            }
          >
            <SelectTrigger id={id("columns")} className="w-38">
              <SelectValue>
                {(next: string) =>
                  next === NONE
                    ? m.list_edit_objekt_columns_not_set()
                    : m.list_edit_objekt_columns_count({ count: next })
                }
              </SelectValue>
            </SelectTrigger>
            <SelectPopup>
              <SelectItem value={NONE}>{m.list_edit_objekt_columns_not_set()}</SelectItem>
              {validColumns.map((count) => (
                <SelectItem key={count} value={String(count)}>
                  {m.list_edit_objekt_columns_count({ count: String(count) })}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </div>
      ) : null}
    </div>
  );
}

function SwitchRow({
  id,
  label,
  description,
  checked,
  disabled,
  onCheckedChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <Label htmlFor={id} className="flex min-w-0 items-start justify-between gap-3 font-normal">
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-muted-foreground text-xs text-pretty">{description}</span>
      </span>
      <Switch
        id={id}
        className="mt-0.5 shrink-0"
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
    </Label>
  );
}
