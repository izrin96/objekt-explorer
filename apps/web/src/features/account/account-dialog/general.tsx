import { ArrowCounterClockwiseIcon, TrashSimpleIcon } from "@phosphor-icons/react";
import type { User } from "@repo/api/services/auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import * as z from "zod";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toastManager } from "@/components/ui/toast";
import { authClient } from "@/lib/auth-client";
import { type FieldErrors, zodErrors } from "@/lib/form";
import { orpc } from "@/lib/orpc";
import { m } from "@/paraglide/messages";

function nameSchema() {
  return z.object({
    name: z.string().min(1, m.common_validation_required_name()),
  });
}

function emailSchema() {
  return z.object({
    email: z.string().min(1, m.common_validation_required_email()),
  });
}

export function GeneralSection({ user }: { user: User }) {
  return (
    <div className="flex flex-col gap-6">
      <ProfileForm user={user} />
      <ChangeEmailForm email={user.email} />
    </div>
  );
}

function ProfileForm({ user }: { user: User }) {
  const queryClient = useQueryClient();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [showSocial, setShowSocial] = useState(user.showSocial ?? false);
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
        mutation.mutate({ name: String(values.name), showSocial, removePic });
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

      <Label
        id="account-show-social-label"
        htmlFor="account-show-social"
        className="flex items-start justify-between gap-4 font-normal"
      >
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">{m.auth_account_show_social_label()}</span>
          <span className="text-muted-foreground text-xs text-pretty">
            {m.auth_account_show_social_desc()}
          </span>
        </span>
        <Switch
          id="account-show-social"
          className="mt-0.5 shrink-0"
          checked={showSocial}
          onCheckedChange={setShowSocial}
        />
      </Label>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">{m.auth_account_remove_profile_picture()}</span>
        <div className="flex items-center gap-3">
          <Avatar className={removePic ? "size-14 opacity-40" : "size-14"}>
            {user.image && !removePic && <AvatarImage src={user.image} alt="" />}
            <AvatarFallback>{user.name.slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
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

function ChangeEmailForm({ email }: { email: string }) {
  const [errors, setErrors] = useState<FieldErrors>({});

  const mutation = useMutation({
    mutationFn: async (newEmail: string) => {
      const result = await authClient.changeEmail({ newEmail });
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      toastManager.add({ type: "success", title: m.auth_account_email_verification_sent() });
    },
    onError: ({ message }) => {
      toastManager.add({
        type: "error",
        title: `${m.auth_account_email_verification_error()}. ${message}`,
      });
    },
  });

  return (
    <Form
      errors={errors}
      onFormSubmit={(values) => {
        const next = zodErrors(emailSchema(), values);
        setErrors(next);
        if (Object.keys(next).length > 0) return;
        mutation.mutate(String(values.email));
      }}
    >
      <Field name="email" className="gap-1.5">
        <FieldLabel>{m.auth_account_email_label()}</FieldLabel>
        <Input
          type="email"
          defaultValue={email}
          aria-required
          placeholder={m.auth_account_email_placeholder()}
        />
        <FieldDescription>{m.auth_account_email_verification_desc()}</FieldDescription>
        <FieldError />
      </Field>

      <div className="flex">
        <Button type="submit" variant="outline" loading={mutation.isPending}>
          {m.auth_account_change_email()}
        </Button>
      </div>
    </Form>
  );
}
