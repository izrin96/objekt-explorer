import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toastManager } from "@/components/ui/toast";
import type { AuthState } from "@/features/auth/sign-in";
import { authClient } from "@/lib/auth-client";
import { type FieldErrors, zodErrors } from "@/lib/form";
import { m } from "@/paraglide/messages";

function schema() {
  return z.object({
    email: z.string().min(1, m.common_validation_required_email()),
  });
}

export function ForgotPasswordForm({ setState }: { setState: (state: AuthState) => void }) {
  const [errors, setErrors] = useState<FieldErrors>({});

  const mutation = useMutation({
    mutationFn: async (email: string) => {
      const result = await authClient.requestPasswordReset({
        email,
        redirectTo: "/auth/reset-password",
      });
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      toastManager.add({ type: "success", title: m.auth_forgot_password_success() });
      setState("sign-in");
    },
  });

  return (
    <Form
      errors={errors}
      onFormSubmit={(values) => {
        const next = zodErrors(schema(), values);
        setErrors(next);
        if (Object.keys(next).length > 0) return;
        mutation.mutate(String(values.email));
      }}
    >
      <Field name="email" className="gap-1.5">
        <FieldLabel>{m.auth_forgot_password_email_label()}</FieldLabel>
        <Input
          type="email"
          autoComplete="email"
          aria-required
          placeholder={m.auth_forgot_password_email_placeholder()}
        />
        <FieldError />
      </Field>

      <Button type="submit" loading={mutation.isPending}>
        {m.auth_forgot_password_submit()}
      </Button>

      {mutation.isError && (
        <p role="alert" className="text-destructive-foreground text-xs text-pretty">
          {m.auth_forgot_password_error({ message: mutation.error.message })}
        </p>
      )}

      <Button variant="outline" onClick={() => setState("sign-in")}>
        {m.auth_forgot_password_back()}
      </Button>
    </Form>
  );
}
