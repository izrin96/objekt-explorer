import { TrashSimpleIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { toastManager } from "@/components/ui/toast";
import { authClient } from "@/lib/auth-client";
import { m } from "@/paraglide/messages";

export function DangerSection() {
  const mutation = useMutation({
    mutationFn: async () => {
      const result = await authClient.deleteUser();
      if (result.error) throw new Error(result.error.message);
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
