import { InfoIcon } from "@phosphor-icons/react";
import { canBeOnTrade, type ListTypeNew, type PublicList } from "@repo/api/schemas/list";
import { flagsOf, type OpenTo, type OpenToFlags, openToOf } from "@repo/api/schemas/open-to";
import { Link } from "@tanstack/react-router";
import slugify from "slugify";
import * as z from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Radio, RadioGroup, RadioPrimitive } from "@/components/ui/radio-group";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { displayNickname, isSameAddress } from "@/lib/address";
import { toneChip } from "@/lib/tone";
import { cn, getBaseURL } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { LIST_TYPE_LABEL, LIST_TYPE_TONE, ListTypeBadge, OPEN_TO_LABEL } from "./list-type-badge";

/** `Select` has no value for "cleared", so the empty choice carries its own. */
const NONE = "__none__";
const CURRENCY_RE = /^[A-Za-z]{3}$/;

const LIST_TYPES: ListTypeNew[] = ["general", "have", "want", "sale"];

const OPEN_TO_ORDER: OpenTo[] = ["swaps", "both", "buying"];

const MATCH_WITH: Record<OpenTo, { label: () => string; description: () => string }> = {
  swaps: { label: OPEN_TO_LABEL.swaps, description: m.list_create_match_trades_desc },
  both: { label: OPEN_TO_LABEL.both, description: m.list_create_match_sales_desc },
  buying: { label: OPEN_TO_LABEL.buying, description: m.list_create_match_buying_desc },
};

const LIST_TYPE_DESC: Record<ListTypeNew, () => string> = {
  general: m.list_create_general_list_desc,
  sale: m.list_create_sale_list_desc,
  have: m.list_create_have_list_desc,
  want: m.list_create_want_list_desc,
};

export type ListDraft = OpenToFlags & {
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
  regenerateSlug: boolean;
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
  matchSale: false,
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
    discoverable: draft.listTypeNew !== "general" && draft.discoverable,
    matchSale: draft.listTypeNew !== "want" || draft.matchSale,
    matchHave: draft.listTypeNew !== "want" || draft.matchHave,
    hideSerial: draft.hideSerial,
  };
}

export function toEditInput(slug: string, draft: ListDraft) {
  const { listTypeNew: _type, isProfileBind: _bind, ...rest } = toCreateInput(draft);
  return { slug, ...rest, gridColumns: draft.gridColumns, regenerateSlug: draft.regenerateSlug };
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
  /** the profile-scoped address a bound list lives at; only edit has one to show */
  url?: ListUrl;
};

export type ListUrl = { nickname: string; profileSlug: string; fallbackSlug: string };

export function ListForm({ idPrefix, value, onChange, lists, profiles, mode, url }: ListFormProps) {
  const id = (field: string) => `${idPrefix}-${field}`;
  const set = (patch: Partial<ListDraft>) => onChange({ ...value, ...patch });

  const isEdit = mode === "edit";
  const isSale = value.listTypeNew === "sale";
  const isPaired = value.listTypeNew === "have" || value.listTypeNew === "want";
  const bindable = value.listTypeNew === "have" || isSale;
  const linkable = lists.filter((list) =>
    value.listTypeNew === "have" ? list.listTypeNew === "want" : list.listTypeNew === "have",
  );
  const discoverableDisabled = !canBeOnTrade(value.listTypeNew, value.isProfileBind);

  const changeType = (next: ListTypeNew | null) => {
    const listTypeNew = next ?? "general";
    const nextBindable = listTypeNew === "have" || listTypeNew === "sale";
    // entering have or sale binds by default, to the chosen profile or else
    // the first; moving between the two keeps what the user set
    const entering = nextBindable && !bindable;
    const profileAddress = entering
      ? (value.profileAddress ?? profiles[0]?.address ?? null)
      : value.profileAddress;
    set({
      listTypeNew,
      linkedListId: null,
      profileAddress,
      isProfileBind: nextBindable && profileAddress !== null && (entering || value.isProfileBind),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex min-w-0 flex-col gap-1.5">
        <Label render={<span />} id={id("type")}>
          {m.list_create_list_type_label()}
        </Label>
        {isEdit ? (
          <div>
            <ListTypeBadge type={value.listTypeNew} size="lg" />
          </div>
        ) : (
          <RadioGroup
            aria-labelledby={id("type")}
            aria-describedby={id("type-desc")}
            value={value.listTypeNew}
            onValueChange={(next) => changeType(next as ListTypeNew)}
            className="grid grid-cols-4 gap-1 rounded-lg border p-1"
          >
            {LIST_TYPES.map((type) => (
              <TypeSegment key={type} type={type} selected={value.listTypeNew === type} />
            ))}
          </RadioGroup>
        )}
        <span id={id("type-desc")} className="text-muted-foreground text-xs text-pretty">
          {LIST_TYPE_DESC[value.listTypeNew]()}
        </span>
      </div>

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

      {/* binding is set only here, and without it a have or sale list never goes on Trade */}
      {bindable && !isEdit && (profiles.length === 0 || !value.isProfileBind) ? (
        <Alert>
          <InfoIcon aria-hidden />
          <AlertDescription>
            {profiles.length === 0 ? (
              <>
                {m.list_create_bind_note_link()}{" "}
                <Link to="/link/connect" className="font-medium underline underline-offset-2">
                  {m.link_link_cosmo()}
                </Link>
              </>
            ) : (
              m.list_create_bind_note_off()
            )}
          </AlertDescription>
        </Alert>
      ) : null}

      <Field name="profileAddress" className="min-w-0 gap-1.5">
        <FieldLabel htmlFor={id("profile")}>
          {value.isProfileBind
            ? m.list_create_profile_tracked_label()
            : m.list_create_profile_display_label()}
        </FieldLabel>
        <Select
          value={value.profileAddress ?? NONE}
          isItemEqualToValue={(item, next) => item === next || isSameAddress(item, next)}
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
                  : displayNickname(
                      next,
                      profiles.find((profile) => isSameAddress(profile.address, next))?.nickname,
                    )
              }
            </SelectValue>
          </SelectTrigger>
          <SelectPopup>
            <SelectItem value={NONE}>{m.common_form_none()}</SelectItem>
            {profiles.map((profile) => (
              <SelectItem key={profile.address} value={profile.address}>
                {displayNickname(profile.address, profile.nickname)}
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

      {/* shown locked in edit: it is the reason the switches below are off */}
      {bindable ? (
        <SwitchRow
          id={id("bind")}
          label={m.list_create_profile_bind_label()}
          description={
            isEdit ? m.list_create_profile_bind_locked_desc() : m.list_create_profile_bind_desc()
          }
          checked={value.isProfileBind}
          disabled={isEdit || value.profileAddress === null}
          onCheckedChange={(checked) => set({ isProfileBind: checked })}
        />
      ) : null}

      {value.listTypeNew !== "general" ? (
        <SwitchRow
          id={id("show-on-trade")}
          label={
            isSale ? m.list_create_discoverable_sale_label() : m.list_create_show_on_trade_label()
          }
          description={
            discoverableDisabled
              ? m.list_create_requires_bind_desc()
              : isSale
                ? m.list_create_on_market_desc()
                : m.list_create_on_trade_desc()
          }
          checked={value.discoverable && !discoverableDisabled}
          disabled={discoverableDisabled}
          onCheckedChange={(checked) => set({ discoverable: checked })}
        />
      ) : null}

      {value.listTypeNew === "want" ? (
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label render={<span />} id={id("match-with")}>
            {m.list_create_match_with_label()}
          </Label>
          <RadioGroup
            aria-labelledby={id("match-with")}
            value={openToOf(value)}
            onValueChange={(next) => set(flagsOf(next as OpenTo))}
            className="gap-2.5"
          >
            {OPEN_TO_ORDER.map((openTo) => (
              <Field key={openTo} className="w-full flex-row items-start gap-2.5">
                <Radio value={openTo} className="mt-0.5" />
                <FieldLabel className="flex-col items-start gap-0.5 font-normal">
                  <span className="text-sm font-medium">{MATCH_WITH[openTo].label()}</span>
                  <FieldDescription render={<span />}>
                    {MATCH_WITH[openTo].description()}
                  </FieldDescription>
                </FieldLabel>
              </Field>
            ))}
          </RadioGroup>
        </div>
      ) : null}

      {/* a serial only exists on an entry the bound profile owns */}
      {isSale || value.listTypeNew === "have" ? (
        <SwitchRow
          id={id("hide-serial")}
          label={m.list_create_hide_serial_label()}
          description={
            value.isProfileBind
              ? m.list_create_hide_serial_desc()
              : m.list_create_requires_bind_desc()
          }
          checked={value.hideSerial}
          disabled={!value.isProfileBind}
          onCheckedChange={(checked) => set({ hideSerial: checked })}
        />
      ) : null}

      {isEdit && url ? (
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor={id("url")}>{m.list_edit_url_label()}</Label>
            <div className="border-input flex min-w-0 overflow-hidden rounded-md border">
              <span className="bg-muted text-muted-foreground border-input flex max-w-[60%] shrink-0 items-center border-e px-3 text-sm">
                <span className="truncate">{`${new URL(getBaseURL()).host}/@${url.nickname}/list/`}</span>
              </span>
              <Input
                id={id("url")}
                readOnly
                unstyled
                className="grow text-sm"
                value={
                  value.regenerateSlug
                    ? slugify(value.name, { lower: true, strict: true }) || url.fallbackSlug
                    : url.profileSlug
                }
              />
            </div>
          </div>
          <Label
            htmlFor={id("regenerate-slug")}
            className="flex min-w-0 items-start gap-2 font-normal"
          >
            <Checkbox
              id={id("regenerate-slug")}
              className="mt-0.5"
              checked={value.regenerateSlug}
              onCheckedChange={(checked) => set({ regenerateSlug: checked })}
            />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-sm font-medium">{m.list_edit_regenerate_slug_label()}</span>
              <span className="text-muted-foreground text-xs text-pretty">
                {m.list_edit_regenerate_slug_desc()}
              </span>
            </span>
          </Label>
        </div>
      ) : null}
    </div>
  );
}

function TypeSegment({ type, selected }: { type: ListTypeNew; selected: boolean }) {
  const tone = LIST_TYPE_TONE[type];
  return (
    <RadioPrimitive.Root
      value={type}
      className={cn(
        "focus-visible:ring-ring focus-visible:ring-offset-background flex min-w-0 cursor-pointer items-center justify-center rounded-md border px-2 py-1.5 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
        selected
          ? tone === "neutral"
            ? "border-border bg-muted text-foreground"
            : toneChip(tone)
          : "text-muted-foreground hover:text-foreground border-transparent",
      )}
    >
      <span className="truncate">{LIST_TYPE_LABEL[type]()}</span>
    </RadioPrimitive.Root>
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
