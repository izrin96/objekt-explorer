import { Badge } from "@/components/ui/badge";
import { SANCTION_LABEL, auditActionLabel, roleLabel } from "@/features/moderation/labels";
import { m } from "@/paraglide/messages";

import { RevokeButton } from "./revoke-dialog";
import { type Account, personName, sectionTitle } from "./shared";
import { When } from "./when";

/**
 * Active sanctions first, each with its Revoke, then the audit log. An ended sanction is not
 * listed again: the audit log already holds the action that issued it and the one that lifted it.
 */
export function History({
  sanctions,
  audit,
  staffTarget,
}: {
  sanctions: Account["sanctions"];
  audit: Account["audit"];
  staffTarget: boolean;
}) {
  const active = sanctions.filter((sanction) => sanction.active);
  return (
    <section aria-labelledby="mod-history" className="flex flex-col gap-3">
      <h2 id="mod-history" className={sectionTitle}>
        {m.mod_history_heading()}
      </h2>
      {active.length > 0 ? (
        <ul className="bg-card flex flex-col divide-y rounded-lg border">
          {active.map((sanction) => (
            <li key={sanction.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
              <div className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{SANCTION_LABEL[sanction.type]()}</span>
                  <Badge variant="warning" size="sm">
                    {m.mod_history_active()}
                  </Badge>
                </span>
                <span className="text-pretty break-words">{sanction.reason}</span>
                <span className="text-muted-foreground text-xs">
                  {m.mod_sanction_by({ name: personName(sanction.issuedBy) })}{" "}
                  <When iso={sanction.createdAt} className="tabular-nums" />
                  {sanction.expiresAt ? (
                    <>
                      {" · "}
                      {m.mod_sanction_ends()}{" "}
                      <When iso={sanction.expiresAt} className="tabular-nums" />
                    </>
                  ) : null}
                </span>
              </div>
              {staffTarget ? null : (
                <RevokeButton sanctionId={sanction.id} label={SANCTION_LABEL[sanction.type]()} />
              )}
            </li>
          ))}
        </ul>
      ) : null}
      {audit.length === 0 ? (
        <p className="text-muted-foreground text-sm">{m.mod_audit_none()}</p>
      ) : (
        <ol className="bg-card flex flex-col divide-y rounded-lg border">
          {audit.map((entry) => {
            const reason =
              typeof entry.detail?.reason === "string" ? entry.detail.reason : undefined;
            const role = typeof entry.detail?.role === "string" ? entry.detail.role : undefined;
            // a ban with no end date stores null, as every action without a length does
            const days = typeof entry.detail?.days === "number" ? entry.detail.days : undefined;
            return (
              <li key={entry.id} className="flex flex-col gap-0.5 px-4 py-3 text-sm">
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-medium">{auditActionLabel(entry.action)}</span>
                  {role ? <span className="text-muted-foreground">→ {roleLabel(role)}</span> : null}
                  {days !== undefined ? (
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {days === 1 ? m.mod_act_one_day() : m.mod_act_days({ count: days })}
                    </span>
                  ) : null}
                  <span className="text-muted-foreground">
                    {entry.actor ? personName(entry.actor) : m.mod_audit_system()}
                  </span>
                  <When
                    iso={entry.createdAt}
                    className="text-muted-foreground ms-auto text-xs tabular-nums"
                  />
                </span>
                {reason ? (
                  <span className="text-muted-foreground text-pretty break-words">{reason}</span>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
