import { ArrowsClockwiseIcon, LinkBreakIcon, LinkIcon } from "@phosphor-icons/react/dist/ssr";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/field";
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
import { listAccountQueryOptions } from "@/lib/query-options";
import { type Provider, type ProviderId, providersMap } from "@/lib/universal/user";

const providers = Object.values(providersMap);

export function ListAccounts() {
  const query = useSuspenseQuery(listAccountQueryOptions());

  const linkedAccounts = query.data.filter((a) => a.providerId !== "credential");
  const unlinkedProviders = providers.filter(
    (a) => !linkedAccounts.some((b) => b.providerId === a.id),
  );

  return (
    <div className="flex flex-col gap-2">
      <Label>Social Link</Label>
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
  const queryClient = useQueryClient();
  const [pullOpen, setPullOpen] = useState(false);
  const unlinkAccount = useMutation(
    orpc.user.unlinkAccount.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.session.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: ["accounts"],
        });
        toast.success(`${provider.label} unlinked`);
      },
      onError: () => {
        toast.error(`Error unlink from ${provider.label}`);
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
    <div className="flex flex-wrap items-center justify-between gap-2">
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
  const queryClient = useQueryClient();
  const refreshProfile = useMutation(
    orpc.user.refreshProfile.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.session.queryKey(),
        });
        setOpen(false);
        toast.success("Profile updated");
      },
      onError: ({ message }) => {
        toast.error(`Error updating profile. ${message}`);
      },
    }),
  );
  return (
    <ModalContent isOpen={open} onOpenChange={setOpen}>
      <ModalHeader>
        <ModalTitle>Update Profile from {provider.label}</ModalTitle>
        <ModalDescription>
          This will update your {provider.label} username and profile picture. Continue?
        </ModalDescription>
      </ModalHeader>
      <ModalFooter>
        <ModalClose>Cancel</ModalClose>
        <Button
          intent="primary"
          type="submit"
          isPending={refreshProfile.isPending}
          onClick={() => refreshProfile.mutate({ providerId: provider.id })}
        >
          Continue
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}
