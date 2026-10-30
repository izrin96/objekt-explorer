import { Link } from "@tanstack/react-router";

import { m } from "@/paraglide/messages";

import { type Account, personName, sectionTitle } from "./shared";
import { When } from "./when";

type LinkEvent = Account["linkHistory"][number];

export function linkEventLabel(event: LinkEvent) {
  const actor = event.actor ? personName(event.actor) : "";
  switch (`${event.event}:${event.reason}`) {
    case "linked:verified":
      return m.mod_link_event_verified();
    case "linked:backfill":
      return m.mod_link_event_backfill();
    case "linked:staff_move":
      return m.mod_link_event_moved_in({ actor });
    case "unlinked:staff_move":
      return m.mod_link_event_moved_out({ actor });
    case "unlinked:user":
      return m.mod_link_event_unlinked_user();
    case "unlinked:staff_unlink":
      return m.mod_link_event_unlinked_staff({ actor });
    case "unlinked:account_deleted":
      return m.mod_link_event_deleted();
    default:
      return event.event === "linked" ? m.mod_link_event_linked() : m.mod_link_event_unlinked();
  }
}

/** `userId` is the account on view; another account's events name it. */
export function LinkHistory({
  userId,
  history,
}: {
  userId: string;
  history: Account["linkHistory"];
}) {
  return (
    <section aria-labelledby="mod-links" className="flex flex-col gap-3">
      <h2 id="mod-links" className={sectionTitle}>
        {m.mod_links_heading()}
      </h2>
      {history.length === 0 ? (
        <p className="text-muted-foreground text-sm">{m.mod_links_none()}</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {history.map((event) => (
            <li key={event.id} className="flex flex-col gap-0.5 text-sm">
              <span className="flex flex-wrap items-baseline gap-x-2">
                {event.account.userId !== userId && (
                  <Link
                    to="/mod/reports/$userId"
                    params={{ userId: event.account.userId }}
                    className="font-medium underline-offset-2 hover:underline"
                  >
                    {personName(event.account)}
                  </Link>
                )}
                <span className="font-medium">{linkEventLabel(event)}</span>
                <When iso={event.at} className="text-muted-foreground text-xs tabular-nums" />
              </span>
              <Link
                to="/mod/addresses/$address"
                params={{ address: event.address }}
                className="text-muted-foreground font-mono text-xs break-all underline-offset-2 hover:underline"
              >
                {event.address}
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
