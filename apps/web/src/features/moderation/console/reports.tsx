import type { ExcerptOffer } from "@repo/api/schemas/moderation";
import { Link } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Bubble } from "@/features/chat/thread/bubble";
import { runPosition } from "@/features/chat/thread/bubble-run";
import { FLAG_LABEL, REASON_LABEL } from "@/features/moderation/labels";
import { offerNo } from "@/features/offers/format";
import { ItemLabel } from "@/features/offers/item-label";
import { pickKey } from "@/features/offers/pick";
import { formatCurrency } from "@/features/settings/use-currency";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { type Account, personName, sectionTitle } from "./shared";
import { When } from "./when";

// a stable ref callback runs once per mounted element, so a link's report scrolls into view
// when it mounts and never again on a re-render
function revealOnMount(node: HTMLElement | null) {
  node?.scrollIntoView({ block: "nearest" });
}

export function Reports({
  reports,
  collections,
  targetName,
  userId,
  selectedReport,
}: {
  reports: Account["reports"];
  collections: Account["tradeCollections"];
  targetName: string;
  userId: string;
  selectedReport: number | undefined;
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
          {reports.map((report) => {
            const selected = report.id === selectedReport;
            return (
              <li
                key={report.id}
                ref={selected ? revealOnMount : undefined}
                aria-current={selected ? "true" : undefined}
                className="aria-[current=true]:border-foreground flex scroll-mt-20 flex-col gap-2 rounded-lg border p-4"
              >
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
                  <Link
                    to="/mod/reports/$userId"
                    params={{ userId }}
                    search={{ report: report.id }}
                    className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded-sm underline-offset-2 outline-none hover:underline focus-visible:ring-2"
                  >
                    <When iso={report.createdAt} className="font-mono text-xs tabular-nums" />
                  </Link>
                </div>
                {report.note ? (
                  <p className="text-sm text-pretty break-words whitespace-pre-wrap">
                    {report.note}
                  </p>
                ) : null}
                {report.excerpt ? (
                  <Excerpt
                    entries={report.excerpt}
                    open={selected}
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
            );
          })}
        </ul>
      )}
    </section>
  );
}

type Entry = NonNullable<Account["reports"][number]["excerpt"]>[number];

/** The only message text moderators ever see: the copy a reporter chose to share. */
function Excerpt({
  entries,
  open,
  collections,
  targetName,
  reporterName,
}: {
  entries: Entry[];
  open: boolean;
  collections: Account["tradeCollections"];
  targetName: string;
  reporterName: string;
}) {
  const stamps = entries.map((entry) => ({ mine: !entry.fromTarget, createdAt: entry.at }));
  return (
    <details open={open} className="group rounded-md border">
      <summary className="text-muted-foreground hover:text-foreground cursor-pointer px-3 py-2 text-xs font-medium">
        {m.mod_excerpt_summary({ count: entries.length })}
      </summary>
      <ol className="flex max-h-128 flex-col overflow-y-auto overscroll-contain border-t px-3 py-3">
        {entries.map((entry, i) => {
          const position = runPosition(stamps[i - 1], stamps[i]!, stamps[i + 1]);
          const startsRun = position === "single" || position === "first";
          const flagged = entry.flagged.length > 0;
          return (
            <li
              key={i}
              className={cn(
                "flex flex-col gap-1 text-sm",
                entry.fromTarget ? "items-start" : "items-end",
                i > 0 && (startsRun ? "mt-3" : "mt-0.5"),
                flagged && "pb-1",
              )}
            >
              <span className="text-muted-foreground flex flex-wrap items-baseline gap-x-2 text-xs">
                {startsRun ? (
                  <span className={entry.fromTarget ? "text-foreground font-medium" : undefined}>
                    {entry.fromTarget ? targetName : reporterName}
                  </span>
                ) : null}
                <When iso={entry.at} className="font-mono tabular-nums" />
                {entry.unsent ? (
                  <span className="text-warning-foreground font-medium">
                    {m.mod_excerpt_unsent()}
                  </span>
                ) : null}
              </span>
              <div
                className={cn(
                  "flex max-w-full flex-col gap-1",
                  entry.fromTarget ? "items-start" : "items-end",
                  flagged && "outline-destructive/60 rounded-2xl outline-2 outline-offset-2",
                )}
              >
                {entry.body ? (
                  <Bubble mine={!entry.fromTarget} position={position} unsent={entry.unsent}>
                    {entry.body}
                  </Bubble>
                ) : null}
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
              </div>
              {flagged ? (
                <span className="flex flex-wrap gap-1">
                  {entry.flagged.map((category) => (
                    <Badge key={category} variant="outline" size="sm">
                      {FLAG_LABEL[category]()}
                    </Badge>
                  ))}
                </span>
              ) : null}
            </li>
          );
        })}
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
