import { ArrowClockwiseIcon, TrashSimpleIcon } from "@phosphor-icons/react";
import {
  type DeleteRefusal,
  type DeletionCheck,
  type DeletionStep,
  isDeleteRefusal,
} from "@repo/api/schemas/user";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toastManager } from "@/components/ui/toast";
import { DeletionBlockers } from "@/features/account/deletion-blockers";
import { deletionCheckOptions } from "@/features/account/queries";
import { authClient } from "@/lib/auth-client";
import { client } from "@/lib/orpc";
import { deleteRefusalText, refusalText } from "@/lib/refusal";
import { m } from "@/paraglide/messages";

async function requestDeletion(step: Exclude<DeletionStep, "sign-in-again">) {
  let token: string | undefined;
  if (step === "delete") {
    ({ token } = await client.user.deletionToken().catch((error: unknown) => {
      throw new Error(refusalText(error));
    }));
  }
  const result = await (token ? authClient.deleteUser({ token }) : authClient.deleteUser());
  if (result.error) {
    const { code } = result.error;
    throw new Error(isDeleteRefusal(code) ? deleteRefusalText(code) : m.api_errors_unknown());
  }
}

/** `refused` comes back from the confirmation link when the account can't be deleted yet. */
export function DangerSection({ refused }: { refused: DeleteRefusal | null }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const check = useQuery(deletionCheckOptions);

  const mutation = useMutation({
    mutationFn: async (step: DeletionStep) => {
      if (step === "sign-in-again") {
        await authClient.signOut();
        await queryClient.invalidateQueries();
        await navigate({ to: "/login", search: { redirect: "/account/danger" } });
      } else {
        await requestDeletion(step);
      }
      return step;
    },
    onSuccess: async (step) => {
      if (step === "send-email") {
        toastManager.add({ type: "success", title: m.auth_account_verification_email_sent() });
      } else if (step === "delete") {
        await queryClient.invalidateQueries();
        await navigate({ to: "/" });
      }
    },
    onError: ({ message }) => {
      toastManager.add({
        type: "error",
        title: `${m.auth_account_delete_account_error()}. ${message}`,
      });
      // a refusal means something now blocks, so the list shows it at once
      void queryClient.invalidateQueries({ queryKey: deletionCheckOptions.queryKey });
    },
  });

  return (
    <div className="border-destructive/32 flex flex-col gap-3 rounded-lg border p-3">
      <span className="text-sm text-pretty">{m.auth_account_delete_account_description()}</span>
      {refused ? (
        <p role="alert" className="text-destructive-foreground text-sm text-pretty">
          {deleteRefusalText(refused)}
        </p>
      ) : null}
      {check.isPending ? (
        <Skeleton className="h-8 w-36 rounded-md" />
      ) : check.isError ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-sm">{m.common_error_loading_data()}</span>
          <Button variant="outline" size="sm" onClick={() => void check.refetch()}>
            <ArrowClockwiseIcon />
            {m.common_error_retry()}
          </Button>
        </div>
      ) : (
        <DeletionAction
          check={check.data}
          pending={mutation.isPending}
          onAct={(step) => mutation.mutate(step)}
        />
      )}
    </div>
  );
}

function DeletionAction({
  check,
  pending,
  onAct,
}: {
  check: DeletionCheck;
  pending: boolean;
  onAct: (step: DeletionStep) => void;
}) {
  const { blockers, openOffers, step } = check;
  const blocked = blockers.length > 0;
  return (
    <>
      {blocked ? <DeletionBlockers blockers={blockers} /> : null}
      {step === "sign-in-again" ? (
        <>
          <p className="text-muted-foreground text-sm text-pretty">
            {m.auth_account_delete_sign_in_again_refused()}
          </p>
          <div className="flex">
            <Button
              variant="outline"
              size="sm"
              disabled={blocked}
              loading={pending}
              onClick={() => onAct(step)}
            >
              {m.auth_account_delete_sign_in_again()}
            </Button>
          </div>
        </>
      ) : (
        <div className="flex">
          <ConfirmDialog
            trigger={
              <AlertDialogTrigger
                disabled={blocked}
                render={<Button variant="destructive-outline" size="sm" loading={pending} />}
              >
                <TrashSimpleIcon />
                {m.auth_account_delete_account()}
              </AlertDialogTrigger>
            }
            title={m.auth_account_delete_account()}
            description={[
              m.auth_account_delete_confirm_offers({ count: openOffers }),
              m.auth_account_delete_confirm_keeps(),
              m.auth_account_delete_confirm_unlinks(),
            ].join(" ")}
            confirmLabel={
              step === "delete" ? m.auth_account_delete_now() : m.auth_account_delete_send_email()
            }
            destructive
            onConfirm={() => onAct(step)}
          />
        </div>
      )}
    </>
  );
}
