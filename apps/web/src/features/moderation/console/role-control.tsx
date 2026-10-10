import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { toastManager } from "@/components/ui/toast";
import { orpc } from "@/lib/orpc";
import { errorReason } from "@/lib/orpc-error";
import { m } from "@/paraglide/messages";

import { sectionTitle } from "./shared";

function roleErrorText(error: unknown) {
  const { reason } = errorReason(error);
  if (reason === "self") return m.mod_error_self();
  if (reason === "staff_target") return m.mod_staff_target();
  return m.mod_role_error();
}

/** Granting or removing a staff role changes who can sanction anyone, so it asks once more. */
export function RoleControl({
  userId,
  name,
  isModerator,
}: {
  userId: string;
  name: string;
  isModerator: boolean;
}) {
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const setRole = useMutation(
    orpc.moderation.setRole.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: orpc.moderation.key() });
        toastManager.add({ type: "success", title: m.mod_role_saved() });
      },
      onError: (error) => toastManager.add({ type: "error", title: roleErrorText(error) }),
    }),
  );

  return (
    <section aria-labelledby="mod-role" className="flex flex-col gap-2 rounded-lg border p-4">
      <h2 id="mod-role" className={sectionTitle}>
        {m.mod_role_heading()}
      </h2>
      <p className="text-muted-foreground text-sm text-pretty">
        {isModerator ? m.mod_role_is_moderator() : m.mod_role_is_user()}
      </p>
      <Button
        variant="outline"
        size="sm"
        className="self-start"
        loading={setRole.isPending}
        onClick={() => setConfirmOpen(true)}
      >
        {isModerator ? m.mod_role_remove() : m.mod_role_grant()}
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={
          isModerator ? m.mod_role_remove_confirm({ name }) : m.mod_role_grant_confirm({ name })
        }
        description={isModerator ? m.mod_role_remove_desc() : m.mod_role_grant_desc()}
        confirmLabel={isModerator ? m.mod_role_remove() : m.mod_role_grant()}
        onConfirm={() => setRole.mutate({ userId, role: isModerator ? "user" : "moderator" })}
      />
    </section>
  );
}
