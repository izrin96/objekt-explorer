import type { ReportReason } from "@repo/api/schemas/moderation";
import { useState } from "react";

import { m } from "@/paraglide/messages";

import { reportRefusal, useBlock, useReport } from "./actions";
import { BlockDialog } from "./block-dialog";
import { ReportDialog } from "./report-dialog";

/**
 * Block and Report… for one account, wherever a menu offers them. The dialogs render outside
 * the menu, so closing the menu does not unmount them.
 */
export function useSafetyDialogs({
  userId,
  name,
  conversationId,
  trade,
}: {
  userId: string;
  name: string;
  /** set when reporting from a conversation, which is what makes sharing messages possible */
  conversationId?: number;
  /** Report a problem: the trade goes along, and the reason starts on scam */
  trade?: { id: number; attachment: string; reason: ReportReason };
}) {
  const [blockOpen, setBlockOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const { block } = useBlock();
  const report = useReport({ onDone: () => setReportOpen(false) });

  const dialogs = (
    <>
      <BlockDialog
        open={blockOpen}
        onOpenChange={setBlockOpen}
        name={name}
        onConfirm={() => block(userId, name)}
      />
      <ReportDialog
        open={reportOpen}
        onOpenChange={(open) => {
          setReportOpen(open);
          if (!open) report.reset();
        }}
        name={name}
        fromConversation={conversationId !== undefined}
        defaultReason={trade?.reason}
        attachment={trade?.attachment}
        pending={report.isPending}
        error={report.error ? (reportRefusal(report.error) ?? m.mod_report_error()) : null}
        onSubmit={(values) =>
          report.mutate({
            userId,
            reason: values.reason,
            note: values.note === "" ? undefined : values.note,
            conversationId,
            share: values.share,
            alsoBlock: values.alsoBlock,
            tradeId: trade?.id,
          })
        }
      />
    </>
  );

  return {
    openBlock: () => setBlockOpen(true),
    openReport: () => setReportOpen(true),
    dialogs,
  };
}
