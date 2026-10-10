import { DiscordLogoIcon, XLogoIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import type React from "react";

import { Button } from "@/components/ui/button";
import { toastManager } from "@/components/ui/toast";
import { authClient } from "@/lib/auth-client";
import { isSafeRedirect } from "@/lib/utils";
import { m } from "@/paraglide/messages";

export function SocialSignIn({ redirect }: { redirect?: string }) {
  const target = redirect !== undefined && isSafeRedirect(redirect) ? redirect : undefined;
  return (
    <div className="flex flex-col gap-2">
      <SocialButton provider="discord" label={m.auth_sign_in_sign_in_discord()} redirect={target}>
        <DiscordLogoIcon size={18} weight="light" />
      </SocialButton>
      <SocialButton provider="twitter" label={m.auth_sign_in_sign_in_twitter()} redirect={target}>
        <XLogoIcon size={18} weight="light" />
      </SocialButton>
    </div>
  );
}

function SocialButton({
  provider,
  label,
  redirect,
  children,
}: {
  provider: "discord" | "twitter";
  label: string;
  redirect: string | undefined;
  children: React.ReactNode;
}) {
  const mutation = useMutation({
    mutationFn: async () => {
      // a ban surfaces at the callback, after the redirect; `/login` reads it from the URL
      const result = await authClient.signIn.social({
        provider,
        callbackURL: redirect ?? "/",
        errorCallbackURL: redirect
          ? `/login?${new URLSearchParams({ redirect }).toString()}`
          : "/login",
      });
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onError: (error) => {
      toastManager.add({
        type: "error",
        title: m.auth_sign_in_error({ message: error.message }),
      });
    },
  });

  return (
    <Button variant="outline" loading={mutation.isPending} onClick={() => mutation.mutate()}>
      {children}
      {label}
    </Button>
  );
}
