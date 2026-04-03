"use client";

import { ArrowsClockwiseIcon, LinkBreakIcon, LinkIcon } from "@phosphor-icons/react/dist/ssr";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { useIntlayer } from "next-intlayer";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc/client";
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

  const linkedAccounts = query.data.filter((a) => a.providerId !== "credential");
  const unlinkedProviders = providers.filter(
    (a) => !linkedAccounts.some((b) => b.providerId === a.id),
  );

  return (
    <div className="flex flex-col gap-2">
      {linkedAccounts.map((a) => (
        <LinkedAccount
          key={a.id}
          provider={providersMap[a.providerId as ProviderId]}
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
  const content = useIntlayer("auth");
  const [pullOpen, setPullOpen] = useState(false);
  const unlinkAccount = useMutation(
    orpc.user.unlinkAccount.mutationOptions({
      onSuccess: async (_, _v, _o, { client }) => {
        void client.invalidateQueries({
          queryKey: ["session"],
        });
        void client.invalidateQueries({
          queryKey: ["accounts"],
        });
        toast.success(content.account.link_accounts.unlinked({ provider: provider.label }).value);
      },
      onError: () => {
        toast.error(content.account.link_accounts.unlink_error({ provider: provider.label }).value);
      },
    }),
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-sm">
        <span>{provider.label}</span>
        <span className="text-muted-fg text-xs">{accountId}</span>
      </div>
      <PullProfileModal provider={provider} open={pullOpen} setOpen={setPullOpen} />
      <div className="flex gap-2">
        <Button intent="outline" size="xs" onPress={() => setPullOpen(true)}>
          <ArrowsClockwiseIcon data-slot="icon" />
          {content.account.link_accounts.refresh.value}
        </Button>
        <Button
          intent="danger"
          size="xs"
          onPress={() =>
            unlinkAccount.mutate({
              providerId: provider.id,
              accountId: accountId,
            })
          }
        >
          <LinkBreakIcon data-slot="icon" />
          {content.account.link_accounts.unlink.value}
        </Button>
      </div>
    </div>
  );
}

type UnlinkedAccountProps = {
  provider: Provider;
};

function UnlinkedAccount({ provider }: UnlinkedAccountProps) {
  const content = useIntlayer("auth");
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
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-sm">{provider.label}</span>
      <Button intent="outline" size="xs" onPress={() => linkAccount.mutate()}>
        <LinkIcon data-slot="icon" />
        {content.account.link_accounts.link.value}
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
  const content = useIntlayer("auth");
  const refreshProfile = useMutation(
    orpc.user.refreshProfile.mutationOptions({
      onSuccess: (_, _v, _o, { client }) => {
        void client.invalidateQueries({
          queryKey: ["session"],
        });
        setOpen(false);
        toast.success(content.account.link_accounts.profile_updated.value);
      },
      onError: ({ message }) => {
        toast.error(content.account.link_accounts.profile_update_error({ message }).value);
      },
    }),
  );
  return (
    <ModalContent isOpen={open} onOpenChange={setOpen}>
      <ModalHeader>
        <ModalTitle>
          {content.account.link_accounts.update_profile_title({ provider: provider.label }).value}
        </ModalTitle>
        <ModalDescription>
          {content.account.link_accounts.update_profile_desc({ provider: provider.label }).value}
        </ModalDescription>
      </ModalHeader>
      <ModalFooter>
        <ModalClose>{content.account.link_accounts.cancel.value}</ModalClose>
        <Button
          intent="primary"
          type="submit"
          isPending={refreshProfile.isPending}
          onPress={() => refreshProfile.mutate(provider.id)}
        >
          {content.account.link_accounts.continue.value}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}
