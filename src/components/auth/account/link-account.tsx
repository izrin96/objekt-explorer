"use client";

import { ArrowsClockwiseIcon, LinkBreakIcon, LinkIcon } from "@phosphor-icons/react/dist/ssr";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button, Label, Modal } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { getQueryClient } from "@/lib/query-client";
import { api } from "@/lib/trpc/client";
import { type Provider, type ProviderId, providersMap } from "@/lib/universal/user";

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
    (a) => !linkedAccounts.some((b) => b.provider === a.id),
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
  const [pullOpen, setPullOpen] = useState(false);
  const session = authClient.useSession();
  const unlinkAccount = api.user.unlinkAccount.useMutation({
    onSuccess: () => {
      toast.success(`${provider.label} unlinked`);
      getQueryClient().invalidateQueries({
        queryKey: ["accounts"],
      });
      session.refetch();
    },
    onError: () => {
      toast.error(`Error unlink from ${provider.label}`);
    },
  });

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 items-center gap-2 text-sm">
        <span>{provider.label}</span>
        <span className="text-muted-fg text-xs">{accountId}</span>
      </div>
      <PullProfileModal provider={provider} open={pullOpen} setOpen={setPullOpen} />
      <Button intent="outline" size="xs" onClick={() => setPullOpen(true)}>
        <ArrowsClockwiseIcon data-slot="icon" />
        Refresh
      </Button>
      <Button
        intent="danger"
        size="xs"
        onClick={() =>
          unlinkAccount.mutate({
            providerId: provider.id,
            accountId: accountId,
          })
        }
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
    <div className="flex items-center justify-between">
      <span className="text-sm">{provider.label}</span>
      <Button intent="outline" size="xs" onClick={() => linkAccount.mutate()}>
        <LinkIcon data-slot="icon" />
        Link
      </Button>
    </div>
  );
}

type PullProfileProps = {
  provider: Provider;
  open: boolean;
  setOpen: (val: boolean) => void;
};

function PullProfileModal({ provider, open, setOpen }: PullProfileProps) {
  const session = authClient.useSession();
  const refreshProfile = api.user.refreshProfile.useMutation({
    onSuccess: () => {
      session.refetch();
      setOpen(false);
      toast.success("Profile updated");
    },
    onError: ({ message }) => {
      toast.error(`Error updating profile. ${message}`);
    },
  });
  return (
    <Modal.Content isOpen={open} onOpenChange={setOpen}>
      <Modal.Header>
        <Modal.Title>Update Profile from {provider.label}</Modal.Title>
        <Modal.Description>
          This will update your {provider.label} username and profile picture. Continue?
        </Modal.Description>
      </Modal.Header>
      <Modal.Footer>
        <Modal.Close>Cancel</Modal.Close>
        <Button
          intent="primary"
          type="submit"
          isPending={refreshProfile.isPending}
          onClick={() => refreshProfile.mutate(provider.id)}
        >
          Continue
        </Button>
      </Modal.Footer>
    </Modal.Content>
  );
}
