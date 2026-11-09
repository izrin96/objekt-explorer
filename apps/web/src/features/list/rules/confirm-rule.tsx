import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type RefObject, useRef } from "react";

import { rich } from "@/components/shared/message-markup";
import {
  AlertDialog,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { toastManager } from "@/components/ui/toast";
import { client, orpc } from "@/lib/orpc";
import { refusalText } from "@/lib/refusal";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import { RULE_KEYS } from "./queries";
import { ruleText } from "./words";

type Rule = Awaited<ReturnType<typeof client.list.rules>>[number];

export function ConfirmRule({
  slug,
  rule,
  action,
  onClose,
  focusAfterDone,
}: {
  slug: string;
  rule: Rule;
  action: "delete" | "detach" | null;
  onClose: () => void;
  /** where focus goes after a delete or detach succeeds, since the rule's own controls leave */
  focusAfterDone?: RefObject<HTMLElement | null>;
}) {
  const queryClient = useQueryClient();
  const done = useRef(false);
  const run = useMutation({
    mutationFn: (kind: "delete" | "detach") =>
      kind === "delete"
        ? client.list.deleteRule({ slug, ruleId: rule.id })
        : client.list.detachRule({ slug, ruleId: rule.id }),
    onSuccess: async (_data, kind) => {
      done.current = true;
      onClose();
      toastManager.add({
        type: "success",
        title:
          kind === "delete"
            ? m.rule_deleted()
            : rule.canMatch === 1
              ? m.rule_detached_one()
              : m.rule_detached({ count: rule.canMatch.toLocaleString(getLocale()) }),
      });
      await Promise.all(
        [...RULE_KEYS, orpc.list.key()].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      );
    },
    onError: (error, kind) => {
      toastManager.add({
        type: "error",
        title: kind === "delete" ? m.rule_delete_error() : m.rule_detach_error(),
        description: refusalText(error),
      });
    },
  });

  const ruleName = <span className="text-foreground">{ruleText(rule)}</span>;

  return (
    <AlertDialog open={action !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogPopup
        className="max-w-sm"
        finalFocus={
          focusAfterDone ? () => (done.current ? focusAfterDone.current : true) : undefined
        }
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display">
            {action === "detach" ? m.rule_detach_title() : m.rule_delete_title()}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {action === "detach"
              ? rich(
                  rule.canMatch === 1
                    ? m.rule_detach_desc_one
                    : (p) =>
                        m.rule_detach_desc({
                          ...p,
                          count: rule.canMatch.toLocaleString(getLocale()),
                        }),
                  { rule: ruleName },
                )
              : rich(m.rule_delete_desc, { rule: ruleName })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={onClose}>
            {m.common_modal_cancel()}
          </Button>
          <Button
            variant={action === "delete" ? "destructive" : "default"}
            loading={run.isPending}
            onClick={() => action && run.mutate(action)}
          >
            {action === "detach" ? m.rule_detach() : m.rule_delete()}
          </Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
}
