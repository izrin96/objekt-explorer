import { TrashSimpleIcon } from "@phosphor-icons/react";
import { DELETE_REFUSALS, type DeleteRefusal } from "@repo/api/schemas/user";
import { useMutation } from "@tanstack/react-query";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { toastManager } from "@/components/ui/toast";
import { authClient } from "@/lib/auth-client";
import { m } from "@/paraglide/messages";

function refusalText(refusal: DeleteRefusal) {
  switch (refusal) {
    case "sanctioned":
      return m.auth_account_delete_sanctioned();
    case "trade_in_progress":
      return m.auth_account_delete_trade_in_progress();
  }
}

const isRefusal = (value: string | undefined): value is DeleteRefusal =>
  DELETE_REFUSALS.some((refusal) => refusal === value);

/** `refused` comes back from the confirmation link when the account can't be deleted yet. */
export function DangerSection({ refused }: { refused: DeleteRefusal | null }) {
  const mutation = useMutation({
    mutationFn: async () => {
      const result = await authClient.deleteUser();
      if (result.error) {
        const { message } = result.error;
        throw new Error(isRefusal(message) ? refusalText(message) : message);
      }
      return result.data;
    },
    onSuccess: () => {
      toastManager.add({ type: "success", title: m.auth_account_verification_email_sent() });
    },
    onError: ({ message }) => {
      toastManager.add({
        type: "error",
        title: `${m.auth_account_delete_account_error()}. ${message}`,
      });
    },
  });

  return (
    <div className="border-destructive/32 flex flex-col gap-2 rounded-lg border p-3">
      <span className="text-sm text-pretty">{m.auth_account_delete_account_description()}</span>
      {refused ? (
        <p role="alert" className="text-destructive-foreground text-sm text-pretty">
          {refusalText(refused)}
        </p>
      ) : null}
      <div className="flex">
        <ConfirmDialog
          trigger={
            <AlertDialogTrigger render={<Button variant="destructive-outline" size="sm" />}>
              <TrashSimpleIcon />
              {m.auth_account_delete_account()}
            </AlertDialogTrigger>
          }
          title={m.auth_account_delete_account()}
          description={m.auth_account_delete_account_description()}
          confirmLabel={m.auth_account_continue()}
          destructive
          onConfirm={() => mutation.mutate()}
        />
      </div>
    </div>
  );
}
