import { truncateAddress } from "@repo/lib/address";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toastManager } from "@/components/ui/toast";
import { orpc } from "@/lib/orpc";
import { errorReason } from "@/lib/orpc-error";
import { m } from "@/paraglide/messages";

import { ReasonDialog, ReasonForm } from "./reason-dialog";

function unlinkErrorText(error: unknown) {
  switch (errorReason(error).reason) {
    case "address_sanctioned":
      return m.mod_address_sanctioned();
    case "address_in_trade":
      return m.mod_address_in_trade();
    case "address_changed":
      return m.mod_address_changed();
    default:
      return m.mod_act_error();
  }
}

/** An admin unlinks an address from its account; the 7-day wait starts as for the user's own unlink. */
export function UnlinkAddressDialog({
  address,
  userId,
  open,
  onOpenChange,
}: {
  address: string;
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <ReasonDialog open={open} onOpenChange={onOpenChange}>
      <UnlinkForm
        address={address}
        short={truncateAddress(address)}
        userId={userId}
        onDone={() => onOpenChange(false)}
      />
    </ReasonDialog>
  );
}

function UnlinkForm({
  address,
  short,
  userId,
  onDone,
}: {
  address: string;
  short: string;
  userId: string;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const unlink = useMutation(
    orpc.moderation.unlinkAddress.mutationOptions({
      onSuccess: () => {
        onDone();
        toastManager.add({ type: "success", title: m.mod_unlink_address_success() });
      },
      onSettled: () => queryClient.invalidateQueries({ queryKey: orpc.moderation.key() }),
    }),
  );

  return (
    <ReasonForm
      title={m.mod_unlink_address_title({ address: short })}
      description={m.mod_unlink_address_description()}
      submitLabel={m.mod_unlink_address_submit()}
      submitVariant="destructive"
      pending={unlink.isPending}
      error={unlink.isError ? unlinkErrorText(unlink.error) : null}
      onSubmit={(reason) => unlink.mutate({ address, userId, reason })}
    />
  );
}
