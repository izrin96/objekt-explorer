import { TrashSimpleIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";

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
      <span className="text-destructive-foreground text-sm font-medium">
        {m.auth_account_danger_zone()}
      </span>
      <span className="text-muted-foreground text-xs text-pretty">
        {m.auth_account_delete_account_description()}
      </span>
      <div className="flex">
        <AlertDialog>
          <AlertDialogTrigger render={<Button variant="destructive-outline" size="sm" />}>
            <TrashSimpleIcon />
            {m.auth_account_delete_account()}
          </AlertDialogTrigger>
          <AlertDialogPopup className="max-w-sm">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-display">
                {m.auth_account_delete_account()}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {m.auth_account_delete_account_description()}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogClose render={<Button variant="outline" />}>
                {m.common_modal_cancel()}
              </AlertDialogClose>
              <AlertDialogClose
                render={<Button variant="destructive" />}
                onClick={() => mutation.mutate()}
              >
                {m.auth_account_continue()}
              </AlertDialogClose>
            </AlertDialogFooter>
          </AlertDialogPopup>
        </AlertDialog>
      </div>
    </div>
  );
}
