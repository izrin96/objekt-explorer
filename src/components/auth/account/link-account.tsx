"use client";

import { Button, Label } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { getQueryClient } from "@/lib/query-client";
import { api } from "@/lib/trpc/client";
import { LinkBreakIcon, LinkIcon } from "@phosphor-icons/react/dist/ssr";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";

type ProviderId = "twitter" | "discord";
type Provider = {
  id: ProviderId;
  label: string;
};

const providersMap: Record<ProviderId, Provider> = {
  twitter: {
    id: "twitter",
    label: "Twitter (X)",
  },
  discord: {
    id: "discord",
    label: "Discord",
  },
};

const providers = Object.values(providersMap);

export function ListAccounts() {
  const query = useSuspenseQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const result = await authClient.listAccounts();
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });

  const linkedAccounts = query.data.filter((a) => a.provider !== "credential");
  const unlinkedProviders = providers.filter(
    (a) => !linkedAccounts.some((b) => b.provider === a.id)
  );

  return (
    <div className="flex flex-col gap-2">
      <Label>Social Link</Label>
      {linkedAccounts.map((a) => (
        <LinkedAccount
          key={a.id}
          provider={providersMap[a.provider as ProviderId]}
          accountId={a.accountId}
        />
      ))}

      {unlinkedProviders.map((provider) => (
        <UnlinkedAccount key={provider.id} provider={provider} />
      ))}
    </div>
  );
}

type LinkedAccountProps = {
  provider: Provider;
  accountId: string;
};

function LinkedAccount({ provider, accountId }: LinkedAccountProps) {
  const session = authClient.useSession();
  const postUnlink = api.user.postUnlink.useMutation({
    onSuccess: () => {
      session.refetch();
    },
  });
  const unlinkAccount = useMutation({
    mutationFn: async () => {
      const result = await authClient.unlinkAccount({
        providerId: provider.id,
        accountId: accountId,
      });
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    onSuccess: () => {
      toast.success(`${provider.label} unlinked`);
      postUnlink.mutate(provider.id);
      getQueryClient().invalidateQueries({
        queryKey: ["accounts"],
      });
    },
    onError: ({ message }) => {
      toast.error(`Error unlink from ${provider.label}. ${message}`);
    },
  });

  return (
    <div className="flex justify-between items-center">
      <div className="flex gap-2 text-sm items-center">
        <span>{provider.label}</span>
        <span className="text-muted-fg text-xs">{accountId}</span>
      </div>
      <Button
        intent="danger"
        size="extra-small"
        onClick={() => unlinkAccount.mutate()}
      >
        <LinkBreakIcon data-slot="icon" />
        Unlink
      </Button>
    </div>
  );
}

type UnlinkedAccountProps = {
  provider: Provider;
};

function UnlinkedAccount({ provider }: UnlinkedAccountProps) {
  const linkAccount = useMutation({
    mutationFn: async () => {
      const result = await authClient.linkSocial({
        provider: provider.id,
      });
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });

  return (
    <div className="flex justify-between items-center">
      <span className="text-sm">{provider.label}</span>
      <Button
        intent="secondary"
        size="extra-small"
        onClick={() => linkAccount.mutate()}
      >
        <LinkIcon data-slot="icon" />
        Link
      </Button>
    </div>
  );
}
