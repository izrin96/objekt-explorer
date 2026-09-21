import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { toastManager } from "@/components/ui/toast";
import { AuthShell } from "@/features/auth/auth-shell";
import { PasswordInput } from "@/features/auth/password-input";
import { authClient } from "@/lib/auth-client";
import { type FieldErrors, zodErrors } from "@/lib/form";
import { m } from "@/paraglide/messages";

function schema() {
  return z.object({
    password: z.string().min(1, m.auth_reset_password_password_required()),
  });
}

export function ResetPassword({ token }: { token: string }) {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});

  const mutation = useMutation({
    mutationFn: async (password: string) => {
      const result = await authClient.resetPassword({ newPassword: password, token });
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: async () => {
      toastManager.add({ type: "success", title: m.auth_reset_password_success() });
      await router.navigate({ to: "/login" });
    },
  });

  return (
    <AuthShell>
      <h1 className="font-display text-xl font-semibold">{m.auth_reset_password_title()}</h1>

      <Form
        errors={errors}
        onFormSubmit={(values) => {
          const next = zodErrors(schema(), values);
          setErrors(next);
          if (Object.keys(next).length > 0) return;
          mutation.mutate(String(values.password));
        }}
      >
        <Field name="password" className="gap-1.5">
          <FieldLabel>{m.auth_reset_password_password_label()}</FieldLabel>
          <PasswordInput
            autoComplete="new-password"
            aria-required
            placeholder={m.auth_reset_password_password_placeholder()}
          />
          <FieldError />
        </Field>

        <Button type="submit" loading={mutation.isPending}>
          {m.auth_reset_password_submit()}
        </Button>

        {mutation.isError && (
          <p role="alert" className="text-destructive-foreground text-xs text-pretty">
            {m.auth_reset_password_error({ message: mutation.error.message })}
          </p>
        )}
      </Form>
    </AuthShell>
  );
}
