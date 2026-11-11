import { Link } from "@tanstack/react-router";

import { m } from "@/paraglide/messages";

import { linkEventLabel } from "./link-event-label";
import { type Account, personName, sectionTitle } from "./shared";
import { When } from "./when";

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
                <When iso={event.at} className="text-muted-foreground text-xs" />
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
