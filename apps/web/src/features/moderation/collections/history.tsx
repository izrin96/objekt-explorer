import type { Outputs } from "@repo/api";

import { When } from "@/features/moderation/console/when";
import { auditActionLabel } from "@/features/moderation/labels";
import { m } from "@/paraglide/messages";

type AdminData = Outputs["admin"]["collectionOverrides"];

/** A stored JSON value read as fields, empty when it is not an object. */
function fieldsOf(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? { ...value } : {};
}

/**
 * An entry's colour: the override, else the colour shown after the write (Cosmo's or the
 * source's, recorded since pins), else "source" for an older entry that has no shown colour.
 */
function colorText(value: unknown, shown?: unknown) {
  if (typeof value === "string") return value;
  return typeof shown === "string" ? shown : m.mod_collections_history_source();
}

/**
 * A pin that changed on a colour that stays overridden; an entry from before pins carries none,
 * which reads as unpinned, and a reset clears the pin with the override, which the colour shows.
 */
function pinChange(before: unknown, after: unknown, field: "text" | "background", colour: unknown) {
  const was = before === true;
  const is = after === true;
  if (was === is || typeof colour !== "string") return null;
  if (field === "text") {
    return is ? m.mod_collections_history_text_pinned() : m.mod_collections_history_text_unpinned();
  }
  return is
    ? m.mod_collections_history_background_pinned()
    : m.mod_collections_history_background_unpinned();
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
            const shown = fieldsOf(detail.shown);
            const changes = [
              before.textColor !== after.textColor
                ? m.mod_collections_history_text({
                    before: colorText(before.textColor),
                    after: colorText(after.textColor, shown.textColor),
                  })
                : null,
              before.backgroundColor !== after.backgroundColor
                ? m.mod_collections_history_background({
                    before: colorText(before.backgroundColor),
                    after: colorText(after.backgroundColor, shown.backgroundColor),
                  })
                : null,
              pinChange(before.textPinned, after.textPinned, "text", after.textColor),
              pinChange(
                before.backgroundPinned,
                after.backgroundPinned,
                "background",
                after.backgroundColor,
              ),
              Array.isArray(detail.from) && detail.from.length > 0
                ? m.mod_collections_history_from({ slugs: detail.from.join(", ") })
                : null,
            ].filter((change) => change !== null);
            const byCosmo = detail.by === "cosmo";
            return (
              <li key={entry.id} className="flex flex-col gap-0.5 px-4 py-3 text-sm">
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-medium">{auditActionLabel(entry.action)}</span>
                  {slug ? <span className="font-mono text-xs">{slug}</span> : null}
                  <span className="text-muted-foreground">
                    {byCosmo
                      ? m.mod_collections_by_cosmo()
                      : (entry.actor?.identity?.name ?? m.mod_person_gone())}
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
