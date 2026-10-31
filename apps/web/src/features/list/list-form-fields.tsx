import type { ListType } from "@repo/api/schemas/list";

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
import { displayNickname, isSameAddress } from "@/lib/address";
import { toneChip } from "@/lib/tone";
import { cn, getBaseURL } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import {
  isListType,
  LIST_TYPE_DESC,
  LIST_TYPES,
  type ListDraft,
  type ListUrl,
  NONE,
  profileLabel,
  profilePatch,
  slugPreview,
} from "./list-draft";
import { LIST_TYPE_LABEL, LIST_TYPE_TONE, ListTypeBadge } from "./list-type-badge";

export function ListTypeField({
  id,
  listType,
  locked,
  onChange,
}: {
  id: (field: string) => string;
  listType: ListType;
  locked: boolean;
  onChange: (next: ListType) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label render={<span />} id={id("type")}>
        {m.list_create_list_type_label()}
      </Label>
      {locked ? (
        <div>
          <ListTypeBadge type={listType} size="lg" />
        </div>
      ) : (
        <RadioGroup
          aria-labelledby={id("type")}
          aria-describedby={id("type-desc")}
          value={listType}
          onValueChange={(next) => {
            if (isListType(next)) onChange(next);
          }}
          className="grid grid-cols-2 gap-1 rounded-lg border p-1 sm:grid-cols-4"
        >
          {LIST_TYPES.map((type) => (
            <TypeSegment key={type} type={type} selected={listType === type} />
          ))}
        </RadioGroup>
      )}
      <span id={id("type-desc")} className="text-muted-foreground text-xs text-pretty">
        {LIST_TYPE_DESC[listType]()}
      </span>
      {locked ? (
        <span className="text-muted-foreground text-xs text-pretty">
          {m.list_edit_type_locked_hint()}
        </span>
      ) : null}
    </div>
  );
}

export function ProfileField({
  id,
  value,
  profiles,
  locked,
  onChange,
}: {
  id: (field: string) => string;
  value: ListDraft;
  profiles: readonly { address: string; nickname: string | null }[];
  locked: boolean;
  onChange: (patch: Pick<ListDraft, "profileAddress" | "isProfileBind">) => void;
}) {
  return locked ? (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{m.list_create_profile_tracked_label()}</span>
      <span className="text-sm">
        {value.profileAddress ? profileLabel(value.profileAddress, profiles) : m.common_form_none()}
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
        onValueChange={(next: string | null) => onChange(profilePatch(value, next))}
      >
        <SelectTrigger id={id("profile")} className="min-w-0">
          <SelectValue placeholder={m.list_create_profile_placeholder()}>
            {(next: string) =>
              next === NONE ? m.common_form_none() : profileLabel(next, profiles)
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
        {value.isProfileBind ? m.list_create_profile_desc() : m.list_create_display_profile_desc()}
      </FieldDescription>
      <FieldError />
    </Field>
  );
}

export function ListUrlField({
  id,
  url,
  name,
  regenerate,
  onRegenerateChange,
}: {
  id: (field: string) => string;
  url: ListUrl;
  name: string;
  regenerate: boolean;
  onRegenerateChange: (checked: boolean) => void;
}) {
  return (
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
            value={slugPreview(name, url, regenerate)}
          />
        </div>
      </div>
      <Label htmlFor={id("regenerate-slug")} className="flex min-w-0 items-start gap-2 font-normal">
        <Checkbox
          id={id("regenerate-slug")}
          className="mt-0.5"
          checked={regenerate}
          onCheckedChange={onRegenerateChange}
        />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm font-medium">{m.list_edit_regenerate_slug_label()}</span>
          <span className="text-muted-foreground text-xs text-pretty">
            {m.list_edit_regenerate_slug_desc()}
          </span>
        </span>
      </Label>
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
      <span className="text-center text-pretty">{LIST_TYPE_LABEL[type]()}</span>
    </RadioPrimitive.Root>
  );
}

export function SwitchRow({
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
