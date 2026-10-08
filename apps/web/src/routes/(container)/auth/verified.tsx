import { SealCheckIcon } from "@phosphor-icons/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useLocation } from "@tanstack/react-router";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { toastManager } from "@/components/ui/toast";
import { AuthHeader, AuthShell } from "@/features/auth/auth-shell";
import { currentUserOptions } from "@/features/user/queries";
import { authClient } from "@/lib/auth-client";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/auth/verified")({
  // Better Auth's verify-email sends `?error=` here for a used or expired link
  validateSearch: z.object({ error: z.string().optional().catch(undefined) }),
  head: ({ match: { search } }) =>
    generateMetadata({
      title:
        search.error === undefined
          ? m.auth_verified_email_verified()
          : m.auth_verified_failed_title(),
    }),
  component: VerifiedPage,
});

function VerifiedPage() {
  const { error } = Route.useSearch();
  const user = useQuery(currentUserOptions).data?.user;

  // an old link opened after the address was already confirmed still lands as a success
  if (error === undefined || user?.emailVerified) return <Verified />;
  return <VerifyFailed email={user?.email} />;
}

function Verified() {
  return (
    <AuthShell>
      <div className="flex flex-col gap-3">
        <SealCheckIcon size={40} weight="light" className="text-muted-foreground" />
        <AuthHeader
          title={m.auth_verified_email_verified()}
          description={m.auth_verified_description()}
        />
      </div>
      <Button render={<Link to="/" />}>{m.auth_account_continue()}</Button>
    </AuthShell>
  );
}

function VerifyFailed({ email }: { email: string | undefined }) {
  // signed out: sign in and come back here, where the resend button then shows
  const href = useLocation({ select: (location) => location.href });
  const mutation = useMutation({
    mutationFn: async (address: string) => {
      const result = await authClient.sendVerificationEmail({
        email: address,
        callbackURL: "/auth/verified",
      });
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      toastManager.add({ type: "success", title: m.auth_verified_resent() });
    },
  });

  return (
    <AuthShell>
      <AuthHeader
        title={m.auth_verified_failed_title()}
        description={`${m.auth_verified_failed_description()} ${
          email === undefined
            ? m.auth_verified_failed_sign_in_hint()
            : m.auth_verified_failed_resend_hint({ email })
        }`}
      />

      {email === undefined ? (
        <Button render={<Link to="/login" search={{ redirect: href }} />}>
          {m.auth_sign_in_title()}
        </Button>
      ) : (
        <Button
          loading={mutation.isPending}
          disabled={mutation.isSuccess}
          onClick={() => mutation.mutate(email)}
        >
          {m.auth_send_new_link()}
        </Button>
      )}

      {mutation.isError && (
        <p role="alert" className="text-destructive-foreground text-xs text-pretty">
          {m.auth_verified_resend_error({ message: mutation.error.message })}
        </p>
      )}
    </AuthShell>
  );
}
