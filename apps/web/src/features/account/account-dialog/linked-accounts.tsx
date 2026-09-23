import {
  ArrowsClockwiseIcon,
  DiscordLogoIcon,
  LinkBreakIcon,
  LinkIcon,
  XLogoIcon,
} from "@phosphor-icons/react";
import { type Provider, type ProviderId, providersMap } from "@repo/api/schemas/user";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type React from "react";

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { toastManager } from "@/components/ui/toast";
import { ACCOUNTS_QUERY_KEY, type LinkedAccount } from "@/features/account/queries";
import { currentUserOptions } from "@/features/user/queries";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";
import { m } from "@/paraglide/messages";

const PROVIDER_ICON: Record<ProviderId, React.ReactElement> = {
  discord: <DiscordLogoIcon weight="fill" className="size-4" />,
  twitter: <XLogoIcon weight="fill" className="size-4" />,
};

const providers = Object.values(providersMap);

export function LinkedAccountsSection({ accounts }: { accounts: LinkedAccount[] }) {
  const linked = accounts.filter((a) => a.providerId !== "credential");

  return (
    <div className="flex flex-col gap-3">
      {providers.map((provider) => {
        const account = linked.find((a) => a.providerId === provider.id);
        return account ? (
          <LinkedRow
            key={provider.id}
            provider={provider}
            accountId={account.id}
            handle={account.accountId}
          />
        ) : (
          <UnlinkedRow key={provider.id} provider={provider} />
        );
      })}
    </div>
  );
}

function useInvalidateAccount() {
  const queryClient = useQueryClient();

  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: currentUserOptions.queryKey }),
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY }),
    ]);
  };
}

function LinkedRow({
  provider,
  accountId,
  handle,
}: {
  provider: Provider;
  accountId: string;
  handle: string;
}) {
  const invalidate = useInvalidateAccount();

  const refresh = useMutation(
    orpc.user.refreshProfile.mutationOptions({
      onSuccess: async () => {
        await invalidate();
        toastManager.add({
          type: "success",
          title: m.auth_account_link_accounts_profile_updated(),
        });
      },
      onError: ({ message }) => {
        toastManager.add({
          type: "error",
          title: m.auth_account_link_accounts_profile_update_error({ message }),
        });
      },
    }),
  );

  const unlink = useMutation({
    mutationFn: async () => {
      const result = await authClient.unlinkAccount({ accountId });
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: async () => {
      await invalidate();
      toastManager.add({
        type: "success",
        title: m.auth_account_link_accounts_unlinked({ provider: provider.label }),
      });
    },
    // the server refuses unlinking the last sign-in method; show its reason
    onError: ({ message }) => {
      toastManager.add({
        type: "error",
        title: m.auth_account_link_accounts_unlink_error({ provider: provider.label }),
        description: message,
      });
    },
  });

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="flex min-w-0 items-center gap-2 text-sm">
        {PROVIDER_ICON[provider.id]}
        {provider.label}
        <span className="text-muted-foreground truncate font-mono text-xs">{handle}</span>
      </span>
      <div className="flex gap-1.5">
        {/* the mutation overwrites the stored name and avatar from the
            provider and has no undo, so it is asked for first */}
        <AlertDialog>
          <AlertDialogTrigger
            render={<Button variant="outline" size="xs" loading={refresh.isPending} />}
          >
            <ArrowsClockwiseIcon />
            {m.auth_account_link_accounts_refresh()}
          </AlertDialogTrigger>
          <AlertDialogPopup className="max-w-sm">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-display">
                {m.auth_account_link_accounts_update_profile_title({ provider: provider.label })}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {m.auth_account_link_accounts_update_profile_desc({ provider: provider.label })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogClose render={<Button variant="outline" />}>
                {m.common_modal_cancel()}
              </AlertDialogClose>
              <AlertDialogClose render={<Button />} onClick={() => refresh.mutate(provider.id)}>
                {m.auth_account_link_accounts_refresh()}
              </AlertDialogClose>
            </AlertDialogFooter>
          </AlertDialogPopup>
        </AlertDialog>
        <AlertDialog>
          <AlertDialogTrigger render={<Button variant="destructive-outline" size="xs" />}>
            <LinkBreakIcon />
            {m.auth_account_link_accounts_unlink()}
          </AlertDialogTrigger>
          <AlertDialogPopup className="max-w-sm">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-display">
                {m.auth_account_link_accounts_unlink_title({ provider: provider.label })}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {m.auth_account_link_accounts_unlink_description({ provider: provider.label })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogClose render={<Button variant="outline" />}>
                {m.common_modal_cancel()}
              </AlertDialogClose>
              <AlertDialogClose
                render={<Button variant="destructive" />}
                onClick={() => unlink.mutate()}
              >
                {m.auth_account_link_accounts_unlink()}
              </AlertDialogClose>
            </AlertDialogFooter>
          </AlertDialogPopup>
        </AlertDialog>
      </div>
    </div>
  );
}

function UnlinkedRow({ provider }: { provider: Provider }) {
  const link = useMutation({
    mutationFn: async () => {
      const result = await authClient.linkSocial({
        provider: provider.id,
        callbackURL: window.location.href,
      });
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onError: ({ message }) => {
      toastManager.add({ type: "error", title: message });
    },
  });

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="flex items-center gap-2 text-sm">
        {PROVIDER_ICON[provider.id]}
        {provider.label}
      </span>
      <Button variant="outline" size="xs" loading={link.isPending} onClick={() => link.mutate()}>
        <LinkIcon />
        {m.auth_account_link_accounts_link()}
      </Button>
    </div>
  );
}
