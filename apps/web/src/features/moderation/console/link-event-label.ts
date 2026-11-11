import { m } from "@/paraglide/messages";

import { type Account, personName } from "./shared";

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
