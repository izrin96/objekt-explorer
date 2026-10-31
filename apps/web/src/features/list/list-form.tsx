import { InfoIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { type ReactNode, useId } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { m } from "@/paraglide/messages";

import { bindNote, isBindable, type ListDraft, type ListUrl, listTypePatch } from "./list-draft";
import { ListTypeField, ListUrlField, ProfileField, SwitchRow } from "./list-form-fields";

export {
  EMPTY_DRAFT,
  type ListDraft,
  type ListUrl,
  listDraftSchema,
  toCreateInput,
  toEditInput,
} from "./list-draft";

type ListFormProps = {
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
  value,
  onChange,
  profiles,
  mode,
  url,
  notice,
  tradeLine,
}: ListFormProps) {
  const prefix = useId();
  const id = (field: string) => `${prefix}-${field}`;
  const set = (patch: Partial<ListDraft>) => onChange({ ...value, ...patch });

  const isEdit = mode === "edit";
  const isSale = value.listType === "sale";
  const isPaired = value.listType === "have" || value.listType === "want";
  const bindable = isBindable(value.listType);
  const note = bindNote(value, mode, profiles.length);

  return (
    <div className="flex flex-col gap-4">
      <ListTypeField
        id={id}
        listType={value.listType}
        locked={isEdit}
        onChange={(next) => set(listTypePatch(value, next, profiles))}
      />

      <Field name="name" className="min-w-0 gap-1.5">
        <FieldLabel htmlFor={id("name")}>{m.list_create_name_label()}</FieldLabel>
        <Input
          id={id("name")}
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
      {note !== null ? (
        <Alert variant="warning">
          <InfoIcon aria-hidden />
          <AlertDescription>
            {note === "link" ? (
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

      <ProfileField
        id={id}
        value={value}
        profiles={profiles}
        locked={isEdit && value.isProfileBind}
        onChange={set}
      />

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
      {bindable ? (
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
        <ListUrlField
          id={id}
          url={url}
          name={value.name}
          regenerate={value.regenerateSlug}
          onRegenerateChange={(checked) => set({ regenerateSlug: checked })}
        />
      ) : null}
    </div>
  );
}
