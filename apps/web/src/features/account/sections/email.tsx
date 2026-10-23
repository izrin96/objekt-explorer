import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toastManager } from "@/components/ui/toast";
import { authClient } from "@/lib/auth-client";
import { type FieldErrors, zodErrors } from "@/lib/form";
import { m } from "@/paraglide/messages";

function emailSchema() {
  return z.object({
    email: z.string().min(1, m.common_validation_required_email()),
  });
}

export function EmailSection({ email }: { email: string }) {
  const [errors, setErrors] = useState<FieldErrors>({});

  const mutation = useMutation({
    mutationFn: async (newEmail: string) => {
      const result = await authClient.changeEmail({ newEmail, callbackURL: "/auth/verified" });
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
