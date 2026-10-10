import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { AuthHeader, authLinkClass } from "@/features/auth/auth-shell";
import { FormError } from "@/features/auth/form-error";
import { authClient } from "@/lib/auth-client";
import { type FieldErrors, zodErrors } from "@/lib/form";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

function schema() {
  return z.object({
    email: z.string().min(1, m.common_validation_required_email()),
  });
}

export function ForgotPasswordForm({ redirect }: { redirect?: string }) {
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
  });

  const backLink = (
    <Link to="/login" search={{ redirect }} className={cn(authLinkClass, "self-center text-sm")}>
      {m.auth_back_to_sign_in()}
    </Link>
  );

  // Better Auth answers the same whether or not the address has an account
  if (mutation.isSuccess) {
    return (
      <>
        <AuthHeader
          title={m.auth_forgot_password_sent_title()}
          description={m.auth_forgot_password_sent_description({ email: mutation.variables })}
        />
        <Button variant="outline" onClick={() => mutation.reset()}>
          {m.auth_forgot_password_retry()}
        </Button>
        {backLink}
      </>
    );
  }

  return (
    <>
      <AuthHeader
        title={m.auth_forgot_password_title()}
        description={m.auth_forgot_password_description()}
      />

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
          <FormError>{m.auth_forgot_password_error({ message: mutation.error.message })}</FormError>
        )}
      </Form>

      {backLink}
    </>
  );
}
