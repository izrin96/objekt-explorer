import type { ExcerptOffer } from "@repo/api/schemas/moderation";

import { Badge } from "@/components/ui/badge";
import { REASON_LABEL } from "@/features/moderation/labels";
import { offerNo } from "@/features/offers/format";
import { ItemLabel } from "@/features/offers/item-label";
import { pickKey } from "@/features/offers/pick";
import { formatCurrency } from "@/features/settings/use-currency";
import { m } from "@/paraglide/messages";

import { type Account, personName, sectionTitle } from "./shared";
import { When } from "./when";

export function Reports({
  reports,
  collections,
  targetName,
}: {
  reports: Account["reports"];
  collections: Account["tradeCollections"];
  targetName: string;
}) {
  return (
    <section aria-labelledby="mod-reports" className="flex flex-col gap-3">
      <h2 id="mod-reports" className={sectionTitle}>
        {m.mod_reports_heading({ count: reports.length })}
      </h2>
      {reports.length === 0 ? (
        <p className="text-muted-foreground text-sm">{m.mod_reports_none()}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {reports.map((report) => (
            <li key={report.id} className="flex flex-col gap-2 rounded-lg border p-4">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="font-semibold">{REASON_LABEL[report.reason]()}</span>
                <Badge variant={report.status === "open" ? "outline" : "secondary"} size="sm">
                  {report.status === "open"
                    ? m.mod_status_open()
                    : report.status === "dismissed"
                      ? m.mod_status_dismissed()
                      : m.mod_status_actioned()}
                </Badge>
                <span className="text-muted-foreground">
                  {m.mod_report_by({ name: personName(report.reporter) })}
                </span>
                <When
                  iso={report.createdAt}
                  className="text-muted-foreground font-mono text-xs tabular-nums"
                />
              </div>
              {report.note ? (
                <p className="text-sm text-pretty break-words whitespace-pre-wrap">{report.note}</p>
              ) : null}
              {report.excerpt ? (
                <Excerpt
                  entries={report.excerpt}
                  collections={collections}
                  targetName={targetName}
                  reporterName={personName(report.reporter)}
                />
              ) : (
                <p className="text-muted-foreground text-xs">
                  {report.fromConversation ? m.mod_excerpt_not_shared() : m.mod_excerpt_profile()}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** The only message text moderators ever see: the copy a reporter chose to share. */
function Excerpt({
  entries,
  collections,
  targetName,
  reporterName,
}: {
  entries: NonNullable<Account["reports"][number]["excerpt"]>;
  collections: Account["tradeCollections"];
  targetName: string;
  reporterName: string;
}) {
  return (
    <details className="group rounded-md border">
      <summary className="text-muted-foreground hover:text-foreground cursor-pointer px-3 py-2 text-xs font-medium">
        {m.mod_excerpt_summary({ count: entries.length })}
      </summary>
      <ol className="flex max-h-128 flex-col gap-2 overflow-y-auto overscroll-contain border-t px-3 py-3">
        {entries.map((entry, i) => (
          <li key={i} className="flex flex-col gap-0.5 text-sm">
            <span className="text-muted-foreground flex flex-wrap items-baseline gap-x-2 text-xs">
              <span className={entry.fromTarget ? "text-foreground font-medium" : undefined}>
                {entry.fromTarget ? targetName : reporterName}
              </span>
              <When iso={entry.at} className="font-mono tabular-nums" />
              {entry.unsent ? (
                <span className="text-warning-foreground font-medium">
                  {m.mod_excerpt_unsent()}
                </span>
              ) : null}
            </span>
            {entry.body ? <p className="break-words whitespace-pre-wrap">{entry.body}</p> : null}
            {entry.card ? (
              <p className="text-muted-foreground font-mono text-xs break-all">
                {m.mod_excerpt_card({ slug: entry.card.collectionSlug })}
              </p>
            ) : null}
            {entry.offer ? (
              <ExcerptOfferView
                offer={entry.offer}
                collections={collections}
                targetName={targetName}
                reporterName={reporterName}
              />
            ) : null}
          </li>
        ))}
      </ol>
    </details>
  );
}

const OFFER_STATUS_LABEL: Record<ExcerptOffer["status"], () => string> = {
  open: m.mod_excerpt_offer_open,
  accepted: m.offer_status_accepted,
  declined: m.offer_status_declined,
  countered: m.offer_status_countered,
  withdrawn: m.offer_status_withdrawn,
  expired: m.offer_status_expired,
  cancelled: m.offer_status_cancelled,
};

/** The offer as it stood when the report was filed, told from the reported account's side. */
function ExcerptOfferView({
  offer,
  collections,
  targetName,
  reporterName,
}: {
  offer: ExcerptOffer;
  collections: Account["tradeCollections"];
  targetName: string;
  reporterName: string;
}) {
  const sides = [
    { key: "give", label: m.mod_excerpt_offer_gives({ name: targetName }), items: offer.give },
    { key: "get", label: m.mod_excerpt_offer_gets({ name: targetName }), items: offer.get },
  ] as const;
  const { topup } = offer;

  return (
    <div className="bg-secondary/40 flex flex-col gap-2 rounded-md border p-2.5 text-xs">
      <p className="flex flex-wrap items-center gap-2">
        <span className="font-mono font-medium">{offerNo(offer.offerId)}</span>
        <Badge variant="outline" size="sm">
          {OFFER_STATUS_LABEL[offer.status]()}
        </Badge>
      </p>
      {sides.map((side) => (
        <div key={side.key} className="flex flex-col gap-0.5">
          <span className="text-muted-foreground">{side.label}</span>
          {side.items.length === 0 ? (
            <span>{m.offer_side_nothing()}</span>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {side.items.map((item) => (
                <li key={pickKey(item)} className="break-words">
                  <ItemLabel item={item} collections={collections} />
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
      {topup ? (
        <p>
          {m.mod_excerpt_offer_topup({
            name: topup.payer === "target" ? targetName : reporterName,
            amount: formatCurrency(Number(topup.amount), topup.currency),
          })}
        </p>
      ) : null}
      {offer.note ? (
        <p className="text-pretty break-words whitespace-pre-wrap">
          <span className="text-muted-foreground">{m.mod_excerpt_offer_note()} </span>
          {offer.note}
        </p>
      ) : null}
    </div>
  );
}
