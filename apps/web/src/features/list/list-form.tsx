import { InfoIcon } from "@phosphor-icons/react";
import type { ListType } from "@repo/api/schemas/list";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import slugify from "slugify";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioPrimitive } from "@/components/ui/radio-group";
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

import type { ListDraft, ListUrl } from "./list-draft";
import { LIST_TYPE_LABEL, LIST_TYPE_TONE, ListTypeBadge } from "./list-type-badge";

export {
  EMPTY_DRAFT,
  type ListDraft,
  type ListUrl,
  listDraftSchema,
  toCreateInput,
  toEditInput,
} from "./list-draft";

/** `Select` has no value for "cleared", so the empty choice carries its own. */
const NONE = "__none__";

const LIST_TYPES: ListType[] = ["general", "have", "want", "sale"];

const isListType = (value: unknown): value is ListType => LIST_TYPES.some((type) => type === value);

const LIST_TYPE_DESC: Record<ListType, () => string> = {
  general: m.list_create_general_list_desc,
  sale: m.list_create_sale_list_desc,
  have: m.list_create_have_list_desc,
  want: m.list_create_want_list_desc,
};

type ListFormProps = {
  /** prefixes every field id, so create and edit can be open in one document */
  idPrefix: string;
  value: ListDraft;
  onChange: (next: ListDraft) => void;
  profiles: { address: string; nickname: string | null }[];
  /** `list.edit` takes neither the type nor the binding, so edit locks both */
  mode: "create" | "edit";
  /** the profile-scoped address a bound list lives at; only edit has one to show */
  url?: ListUrl;
  /** one line under the binding switch, for a note about what the form's current choices do */
  notice?: ReactNode;
  /** a have, want or sale list's place on Trade, which the post composer sets */
  tradeLine?: ReactNode;
};

export function ListForm({
  idPrefix,
  value,
  onChange,
  profiles,
  mode,
  url,
  notice,
  tradeLine,
}: ListFormProps) {
  const id = (field: string) => `${idPrefix}-${field}`;
  const set = (patch: Partial<ListDraft>) => onChange({ ...value, ...patch });

  const isEdit = mode === "edit";
  const isSale = value.listType === "sale";
  const isPaired = value.listType === "have" || value.listType === "want";
  const bindable = value.listType === "have" || isSale;

  const changeType = (next: ListType | null) => {
    const listType = next ?? "general";
    const nextBindable = listType === "have" || listType === "sale";
    // entering have or sale binds by default, to the chosen profile or else
    // the first; moving between the two keeps what the user set
    const entering = nextBindable && !bindable;
    const profileAddress = entering
      ? (value.profileAddress ?? profiles[0]?.address ?? null)
      : value.profileAddress;
    set({
      listType,
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
            <ListTypeBadge type={value.listType} size="lg" />
          </div>
        ) : (
          <RadioGroup
            aria-labelledby={id("type")}
            aria-describedby={id("type-desc")}
            value={value.listType}
            onValueChange={(next) => {
              if (isListType(next)) changeType(next);
            }}
            className="grid grid-cols-4 gap-1 rounded-lg border p-1"
          >
            {LIST_TYPES.map((type) => (
              <TypeSegment key={type} type={type} selected={value.listType === type} />
            ))}
          </RadioGroup>
        )}
        <span id={id("type-desc")} className="text-muted-foreground text-xs text-pretty">
          {LIST_TYPE_DESC[value.listType]()}
        </span>
        {isEdit ? (
          <span className="text-muted-foreground text-xs text-pretty">
            {m.list_edit_type_locked_hint()}
          </span>
        ) : null}
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

      {/* binding is set only here, and without it a have or sale list never goes on Trade */}
      {bindable && !isEdit && (profiles.length === 0 || !value.isProfileBind) ? (
        <Alert variant="warning">
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

      {isEdit && value.isProfileBind ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">{m.list_create_profile_tracked_label()}</span>
          <span className="text-sm">
            {value.profileAddress
              ? displayNickname(
                  value.profileAddress,
                  profiles.find((profile) => isSameAddress(profile.address, value.profileAddress))
                    ?.nickname,
                )
              : m.common_form_none()}
          </span>
        </div>
      ) : (
        <Field name="profileAddress" className="min-w-0 gap-1.5">
          <FieldLabel htmlFor={id("profile")}>
            {value.isProfileBind
              ? m.list_create_profile_tracked_label()
              : m.list_create_profile_display_label()}
          </FieldLabel>
          <Select
            value={value.profileAddress ?? NONE}
            isItemEqualToValue={(item, next) => item === next || isSameAddress(item, next)}
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
      )}

      {/* shown locked in edit: it is why Hide Serial Numbers is off and the list can't go on Trade */}
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

      {notice}

      {isPaired || isSale ? tradeLine : null}

      {/* a serial only exists on an entry the bound profile owns */}
      {isSale || value.listType === "have" ? (
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

function TypeSegment({ type, selected }: { type: ListType; selected: boolean }) {
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
