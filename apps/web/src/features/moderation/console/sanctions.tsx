import { Badge } from "@/components/ui/badge";
import { SANCTION_LABEL } from "@/features/moderation/labels";
import { m } from "@/paraglide/messages";

import { RevokeButton } from "./revoke-dialog";
import { type Account, personName, sectionTitle } from "./shared";
import { When } from "./when";

export function Sanctions({
  sanctions,
  staffTarget,
}: {
  sanctions: Account["sanctions"];
  staffTarget: boolean;
}) {
  return (
    <section aria-labelledby="mod-sanctions" className="flex flex-col gap-3">
      <h2 id="mod-sanctions" className={sectionTitle}>
        {m.mod_sanctions_heading()}
      </h2>
      {sanctions.length === 0 ? (
        <p className="text-muted-foreground text-sm">{m.mod_sanctions_none()}</p>
      ) : (
        <ul className="flex flex-col divide-y rounded-lg border">
          {sanctions.map((sanction) => (
            <li key={sanction.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
              <div className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{SANCTION_LABEL[sanction.type]()}</span>
                  {sanction.active ? (
                    <Badge variant="outline" size="sm">
                      {m.mod_sanction_active()}
                    </Badge>
                  ) : sanction.revokedAt ? (
                    <Badge variant="secondary" size="sm">
                      {m.mod_sanction_revoked()}
                    </Badge>
                  ) : null}
                </span>
                <span className="text-pretty break-words">{sanction.reason}</span>
                <span className="text-muted-foreground text-xs">
                  {m.mod_sanction_by({ name: personName(sanction.issuedBy) })}{" "}
                  <When iso={sanction.createdAt} className="font-mono tabular-nums" />
                  {sanction.expiresAt ? (
                    <>
                      {" · "}
                      {m.mod_sanction_ends()}{" "}
                      <When iso={sanction.expiresAt} className="font-mono tabular-nums" />
                    </>
                  ) : null}
                </span>
              </div>
              {sanction.active && !staffTarget ? (
                <RevokeButton sanctionId={sanction.id} label={SANCTION_LABEL[sanction.type]()} />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
