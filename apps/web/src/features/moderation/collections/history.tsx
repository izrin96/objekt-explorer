import type { Outputs } from "@repo/api";

import { When } from "@/features/moderation/console/when";
import { auditActionLabel } from "@/features/moderation/labels";
import { m } from "@/paraglide/messages";

type AdminData = Outputs["admin"]["collectionOverrides"];

/** A stored JSON value read as fields, empty when it is not an object. */
function fieldsOf(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? { ...value } : {};
}

function colorText(value: unknown) {
  return typeof value === "string" ? value : m.mod_collections_history_source();
}

export function History({ history }: { history: AdminData["history"] }) {
  return (
    <section aria-labelledby="collections-history" className="flex flex-col gap-3">
      <h2 id="collections-history" className="text-base font-semibold">
        {m.mod_collections_history()}
      </h2>
      {history.length === 0 ? (
        <p className="text-muted-foreground text-sm">{m.mod_collections_history_empty()}</p>
      ) : (
        <ol className="bg-card flex flex-col divide-y rounded-lg border">
          {history.map((entry) => {
            const detail = entry.detail ?? {};
            const slug = typeof detail.slug === "string" ? detail.slug : null;
            const before = fieldsOf(detail.before);
            const after = fieldsOf(detail.after);
            const changes = [
              before.textColor !== after.textColor
                ? m.mod_collections_history_text({
                    before: colorText(before.textColor),
                    after: colorText(after.textColor),
                  })
                : null,
              before.backgroundColor !== after.backgroundColor
                ? m.mod_collections_history_background({
                    before: colorText(before.backgroundColor),
                    after: colorText(after.backgroundColor),
                  })
                : null,
            ].filter((change) => change !== null);
            return (
              <li key={entry.id} className="flex flex-col gap-0.5 px-4 py-3 text-sm">
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-medium">{auditActionLabel(entry.action)}</span>
                  {slug ? <span className="font-mono text-xs">{slug}</span> : null}
                  <span className="text-muted-foreground">
                    {entry.actor?.identity?.name ?? m.mod_person_gone()}
                  </span>
                  <When
                    iso={entry.createdAt}
                    className="text-muted-foreground ms-auto text-xs tabular-nums"
                  />
                </span>
                {changes.length > 0 ? (
                  <span className="text-muted-foreground font-mono text-xs">
                    {changes.join(" · ")}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
