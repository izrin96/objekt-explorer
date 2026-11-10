import { ArrowCounterClockwiseIcon, TrashSimpleIcon } from "@phosphor-icons/react";
import type { User } from "@repo/api/services/account/auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import * as z from "zod";

import { PersonAvatar } from "@/components/shared/person-avatar";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toastManager } from "@/components/ui/toast";
import { type FieldErrors, zodErrors } from "@/lib/form";
import { orpc } from "@/lib/orpc";
import { m } from "@/paraglide/messages";

function nameSchema() {
  return z.object({
    name: z.string().min(1, m.common_validation_required_name()),
  });
}

type OfferRule = "onlyWantedOffers" | "allowCollectionAsks" | "multiPostAsks";
// a column added after the session was read is unknown until then: its default stands in
const RULE_DEFAULTS: Record<OfferRule, boolean> = {
  onlyWantedOffers: false,
  allowCollectionAsks: false,
  multiPostAsks: true,
};

export function GeneralSection({ user }: { user: User }) {
  const queryClient = useQueryClient();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [showSocial, setShowSocial] = useState(user.showSocial ?? false);
  const [showOnline, setShowOnline] = useState(user.showOnline ?? true);
  // only the rules switched here are sent: another tab or the Messages notice may have changed the rest
  const [ruleEdits, setRuleEdits] = useState<Partial<Record<OfferRule, boolean>>>({});
  const rule = (key: OfferRule) => ruleEdits[key] ?? user[key] ?? RULE_DEFAULTS[key];
  const editRule = (key: OfferRule) => (checked: boolean) =>
    setRuleEdits((edits) => ({ ...edits, [key]: checked }));
  // the picture comes from the provider; removing it is a pending edit until Save
  const [removePic, setRemovePic] = useState(false);

  const mutation = useMutation(
    orpc.user.updateAccount.mutationOptions({
      onSuccess: async () => {
        setRemovePic(false);
        await queryClient.invalidateQueries();
        setRuleEdits({});
        toastManager.add({ type: "success", title: m.auth_account_account_updated() });
      },
      onError: ({ message }) => {
        toastManager.add({
          type: "error",
          title: `${m.auth_account_account_update_error()}. ${message}`,
        });
      },
    }),
  );

  return (
    <Form
      errors={errors}
      onFormSubmit={(values) => {
        const next = zodErrors(nameSchema(), values);
        setErrors(next);
        if (Object.keys(next).length > 0) return;
        mutation.mutate({
          name: String(values.name),
          showSocial,
          showOnline,
          ...ruleEdits,
          removePic,
        });
      }}
    >
      <Field name="name" className="gap-1.5">
        <FieldLabel>{m.auth_account_name_label()}</FieldLabel>
        <Input
          defaultValue={user.name}
          aria-required
          placeholder={m.auth_account_name_placeholder()}
        />
        <FieldError />
      </Field>

      <SwitchRow
        id="account-show-social"
        label={m.auth_account_show_social_label()}
        description={m.auth_account_show_social_desc()}
        checked={showSocial}
        onCheckedChange={setShowSocial}
      />
      <SwitchRow
        id="account-show-online"
        label={m.auth_account_show_online_label()}
        description={m.auth_account_show_online_desc()}
        checked={showOnline}
        onCheckedChange={setShowOnline}
      />

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-3 text-sm font-medium">{m.auth_account_offers_heading()}</legend>
        <SwitchRow
          id="account-only-wanted-offers"
          label={m.auth_account_only_wanted_label()}
          description={m.auth_account_only_wanted_desc()}
          checked={rule("onlyWantedOffers")}
          onCheckedChange={editRule("onlyWantedOffers")}
        />
        <SwitchRow
          id="account-multi-post-asks"
          label={m.auth_account_multi_post_label()}
          description={m.auth_account_multi_post_desc()}
          checked={rule("multiPostAsks")}
          onCheckedChange={editRule("multiPostAsks")}
        />
        <SwitchRow
          id="account-allow-collection-asks"
          label={m.auth_account_collection_asks_label()}
          description={m.auth_account_collection_asks_desc()}
          checked={rule("allowCollectionAsks")}
          onCheckedChange={editRule("allowCollectionAsks")}
        />
      </fieldset>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">{m.auth_account_profile_picture()}</span>
        <div className="flex items-center gap-3">
          <PersonAvatar
            name={user.name}
            image={removePic ? null : user.image}
            className={removePic ? "size-14 opacity-40" : "size-14"}
          />
          {removePic ? (
            <Button variant="outline" size="sm" onClick={() => setRemovePic(false)}>
              <ArrowCounterClockwiseIcon />
              {m.common_actions_undo()}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled={!user.image}
              onClick={() => setRemovePic(true)}
            >
              <TrashSimpleIcon />
              {m.common_actions_remove()}
            </Button>
          )}
        </div>
        <span className="text-muted-foreground text-xs text-pretty">
          {m.auth_account_profile_pic_help()}
        </span>
      </div>

      <div className="flex">
        <Button type="submit" loading={mutation.isPending}>
          {m.auth_account_save()}
        </Button>
      </div>
    </Form>
  );
}

function SwitchRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <Label
      id={`${id}-label`}
      htmlFor={id}
      className="flex items-start justify-between gap-4 font-normal"
    >
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-muted-foreground text-xs text-pretty">{description}</span>
      </span>
      <Switch
        id={id}
        className="mt-0.5 shrink-0"
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    </Label>
  );
}
