import { auditActionLabel, roleLabel } from "@/features/moderation/labels";
import { m } from "@/paraglide/messages";

import { type Account, personName, sectionTitle } from "./shared";
import { When } from "./when";

export function Audit({ audit }: { audit: Account["audit"] }) {
  return (
    <section aria-labelledby="mod-audit" className="flex flex-col gap-3">
      <h2 id="mod-audit" className={sectionTitle}>
        {m.mod_audit_heading()}
      </h2>
      {audit.length === 0 ? (
        <p className="text-muted-foreground text-sm">{m.mod_audit_none()}</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {audit.map((entry) => {
            const reason =
              typeof entry.detail?.reason === "string" ? entry.detail.reason : undefined;
            const role = typeof entry.detail?.role === "string" ? entry.detail.role : undefined;
            return (
              <li key={entry.id} className="flex flex-col gap-0.5 text-sm">
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-medium">{auditActionLabel(entry.action)}</span>
                  {role ? <span className="text-muted-foreground">→ {roleLabel(role)}</span> : null}
                  <span className="text-muted-foreground">
                    {entry.actor ? personName(entry.actor) : m.mod_audit_system()}
                  </span>
                  <When
                    iso={entry.createdAt}
                    className="text-muted-foreground font-mono text-xs tabular-nums"
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
