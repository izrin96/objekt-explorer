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
import { toastManager } from "@/components/ui/toast";
import { type FieldErrors, zodErrors } from "@/lib/form";
import { orpc } from "@/lib/orpc";
import { m } from "@/paraglide/messages";

import { SwitchRow } from "./switch-row";

function nameSchema() {
  return z.object({
    name: z.string().min(1, m.common_validation_required_name()),
  });
}

export function GeneralSection({ user }: { user: User }) {
  const queryClient = useQueryClient();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [showSocial, setShowSocial] = useState(user.showSocial ?? false);
  const [showOnline, setShowOnline] = useState(user.showOnline ?? true);
  // the picture comes from the provider; removing it is a pending edit until Save
  const [removePic, setRemovePic] = useState(false);

  const mutation = useMutation(
    orpc.user.updateAccount.mutationOptions({
      onSuccess: async () => {
        setRemovePic(false);
        await queryClient.invalidateQueries();
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
