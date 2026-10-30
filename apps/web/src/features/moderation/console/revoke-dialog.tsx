import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { toastManager } from "@/components/ui/toast";
import { orpc } from "@/lib/orpc";
import { errorReason } from "@/lib/orpc-error";
import { m } from "@/paraglide/messages";

import { ReasonDialog, ReasonForm } from "./reason-dialog";

function revokeErrorText(error: unknown) {
  const { reason } = errorReason(error);
  if (reason === "staff_target") return m.mod_staff_target();
  if (reason === "self") return m.mod_error_self();
  return m.mod_act_error();
}

/** Revoking lifts a sanction, so it needs a reason for the audit log like any other action. */
export function RevokeButton({ sanctionId, label }: { sanctionId: number; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        aria-label={m.mod_revoke_name({ sanction: label })}
        onClick={() => setOpen(true)}
      >
        {m.mod_revoke()}
      </Button>
      <ReasonDialog open={open} onOpenChange={setOpen}>
        <RevokeForm sanctionId={sanctionId} label={label} onDone={() => setOpen(false)} />
      </ReasonDialog>
    </>
  );
}

function RevokeForm({
  sanctionId,
  label,
  onDone,
}: {
  sanctionId: number;
  label: string;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const revoke = useMutation(
    orpc.moderation.revoke.mutationOptions({
      // close first, so focus returns to the Revoke button before the list refetches
      onSuccess: () => {
        onDone();
        toastManager.add({ type: "success", title: m.mod_revoke_success() });
      },
      // the refetch below drops this row and its dialog, so the stale case is told in a toast
      onError: (error) => {
        if (errorReason(error).reason !== "not_active") return;
        onDone();
        toastManager.add({ type: "info", title: m.mod_revoke_not_active() });
      },
      // an already-ended sanction means the page is stale either way
      onSettled: () => queryClient.invalidateQueries({ queryKey: orpc.moderation.key() }),
    }),
  );

  return (
    <ReasonForm
      title={m.mod_revoke_title({ sanction: label })}
      description={m.mod_revoke_description()}
      submitLabel={m.mod_revoke()}
      pending={revoke.isPending}
      error={revoke.isError ? revokeErrorText(revoke.error) : null}
      onSubmit={(reason) => revoke.mutate({ sanctionId, reason })}
    />
  );
}
