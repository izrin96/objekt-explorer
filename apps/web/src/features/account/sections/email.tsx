import { WarningIcon } from "@phosphor-icons/react";
import { hasDeliverableEmail } from "@repo/api/lib/account-deletion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import * as z from "zod";

import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toastManager } from "@/components/ui/toast";
import { currentUserOptions } from "@/features/user/queries";
import { authClient } from "@/lib/auth-client";
import { type FieldErrors, zodErrors } from "@/lib/form";
import { m } from "@/paraglide/messages";

function emailSchema() {
  return z.object({
    email: z.string().min(1, m.common_validation_required_email()),
  });
}

function VerifyEmailNotice({ email }: { email: string }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async () => {
      const result = await authClient.sendVerificationEmail({
        email,
        callbackURL: "/auth/verified",
      });
      // verified from the link in another tab: the cached user here is stale
      if (result.error?.code === "EMAIL_ALREADY_VERIFIED") return "verified" as const;
      if (result.error) throw new Error(result.error.message);
      return "sent" as const;
    },
    onSuccess: async (outcome) => {
      if (outcome === "sent") {
        toastManager.add({ type: "success", title: m.auth_verified_resent() });
        return;
      }
      toastManager.add({ type: "success", title: m.auth_verified_email_verified() });
      await queryClient.invalidateQueries({ queryKey: currentUserOptions.queryKey });
    },
    onError: ({ message }) => {
      toastManager.add({ type: "error", title: m.auth_verified_resend_error({ message }) });
    },
  });

  return (
    <Alert variant="warning" role="status">
      <WarningIcon />
      <AlertTitle>{m.auth_account_email_unverified_title()}</AlertTitle>
      <AlertDescription>{m.auth_account_email_unverified_desc()}</AlertDescription>
      <AlertAction>
        <Button
          variant="outline"
          size="sm"
          loading={mutation.isPending}
          disabled={mutation.isSuccess}
          onClick={() => mutation.mutate()}
        >
          {m.auth_account_email_verify_send()}
        </Button>
      </AlertAction>
    </Alert>
  );
}

export function EmailSection({ email, verified }: { email: string; verified: boolean }) {
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
    <>
      {/* a Discord sign-up without an email has a placeholder address no link can reach */}
      {!verified && hasDeliverableEmail(email) ? <VerifyEmailNotice email={email} /> : null}
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
          <Button type="submit" loading={mutation.isPending}>
            {m.auth_account_save()}
          </Button>
        </div>
      </Form>
    </>
  );
}
