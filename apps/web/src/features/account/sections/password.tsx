import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { toastManager } from "@/components/ui/toast";
import { PasswordInput } from "@/features/auth/password-input";
import { authClient } from "@/lib/auth-client";
import { type FieldErrors, zodErrors } from "@/lib/form";
import { m } from "@/paraglide/messages";

function schema() {
  return z
    .object({
      currentPassword: z.string().min(1, m.common_validation_required_password()),
      newPassword: z.string().min(1, m.common_validation_required_password()),
      confirmPassword: z.string().min(1, m.common_validation_required_password()),
    })
    .refine((v) => v.newPassword === v.confirmPassword, {
      path: ["confirmPassword"],
      message: m.auth_account_password_mismatch(),
    });
}

export function PasswordSection() {
  const [errors, setErrors] = useState<FieldErrors>({});

  const mutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const result = await authClient.changePassword(data);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      toastManager.add({ type: "success", title: m.auth_account_password_changed() });
    },
    onError: ({ message }) => {
      toastManager.add({
        type: "error",
        title: `${m.auth_account_password_change_error()}. ${message}`,
      });
    },
  });

  return (
    <Form
      errors={errors}
      onFormSubmit={(values) => {
        const next = zodErrors(schema(), values);
        setErrors(next);
        if (Object.keys(next).length > 0) return;
        mutation.mutate({
          currentPassword: String(values.currentPassword),
          newPassword: String(values.newPassword),
        });
      }}
    >
      <Field name="currentPassword" className="gap-1.5">
        <FieldLabel>{m.auth_account_current_password_label()}</FieldLabel>
        <PasswordInput
          autoComplete="current-password"
          aria-required
          placeholder={m.auth_account_current_password_placeholder()}
        />
        <FieldError />
      </Field>

      <Field name="newPassword" className="gap-1.5">
        <FieldLabel>{m.auth_account_new_password_label()}</FieldLabel>
        <PasswordInput
          autoComplete="new-password"
          aria-required
          placeholder={m.auth_account_new_password_placeholder()}
        />
        <FieldError />
      </Field>

      <Field name="confirmPassword" className="gap-1.5">
        <FieldLabel>{m.auth_account_confirm_password_label()}</FieldLabel>
        <PasswordInput autoComplete="new-password" aria-required />
        <FieldError />
      </Field>

      <div className="flex">
        <Button type="submit" loading={mutation.isPending}>
          {m.auth_account_save()}
        </Button>
      </div>
    </Form>
  );
}
