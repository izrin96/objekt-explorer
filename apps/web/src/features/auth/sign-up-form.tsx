import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toastManager } from "@/components/ui/toast";
import { PasswordInput } from "@/features/auth/password-input";
import { useAuthSuccess } from "@/features/auth/redirect";
import type { AuthState } from "@/features/auth/sign-in";
import { authClient } from "@/lib/auth-client";
import { type FieldErrors, zodErrors } from "@/lib/form";
import { m } from "@/paraglide/messages";

function schema() {
  return z.object({
    name: z.string().min(1, m.common_validation_required_name()),
    email: z.string().min(1, m.common_validation_required_email()),
    password: z.string().min(1, m.common_validation_required_password()),
  });
}

export function SignUpForm({
  setState,
  redirect,
}: {
  setState: (state: AuthState) => void;
  redirect?: string;
}) {
  const onSuccess = useAuthSuccess(redirect);
  const [errors, setErrors] = useState<FieldErrors>({});

  const mutation = useMutation({
    mutationFn: async (data: { name: string; email: string; password: string }) => {
      const result = await authClient.signUp.email(data);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: async () => {
      toastManager.add({ type: "success", title: m.auth_sign_up_success() });
      await onSuccess();
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
          name: String(values.name),
          email: String(values.email),
          password: String(values.password),
        });
      }}
    >
      <Field name="name" className="gap-1.5">
        <FieldLabel>{m.auth_sign_up_name_label()}</FieldLabel>
        <Input
          type="text"
          autoComplete="name"
          aria-required
          placeholder={m.auth_sign_up_name_placeholder()}
        />
        <FieldError />
      </Field>

      <Field name="email" className="gap-1.5">
        <FieldLabel>{m.auth_sign_up_email_label()}</FieldLabel>
        <Input
          type="email"
          autoComplete="email"
          aria-required
          placeholder={m.auth_sign_up_email_placeholder()}
        />
        <FieldError />
      </Field>

      <Field name="password" className="gap-1.5">
        <FieldLabel>{m.auth_sign_up_password_label()}</FieldLabel>
        <PasswordInput autoComplete="new-password" aria-required />
        <FieldError />
      </Field>

      <Button type="submit" loading={mutation.isPending}>
        {m.auth_sign_up_submit()}
      </Button>

      {mutation.isError && (
        <p role="alert" className="text-destructive-foreground text-xs text-pretty">
          {m.auth_sign_up_error({ message: mutation.error.message })}
        </p>
      )}

      <Button variant="outline" onClick={() => setState("sign-in")}>
        {m.auth_sign_up_back()}
      </Button>

      <Link
        to="/terms-privacy"
        className="text-muted-foreground text-center text-xs underline underline-offset-2"
      >
        {m.auth_sign_up_terms()}
      </Link>
    </Form>
  );
}
