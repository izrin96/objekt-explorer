import type { Notification } from "@repo/api/schemas/notification";
import { NOTE_OBJEKTS } from "@repo/api/schemas/offer";

/**
 * The collections a notification names, in the order it leads with them: an alert's newest
 * matches, an offer's or trade's objekts. A moderator notice names none, and neither does a row
 * written before offers and trades did.
 */
export function notificationSlugs(notification: Notification): readonly string[] {
  switch (notification.type) {
    case "want_match":
    case "have_wanted":
      return notification.payload.latest.map((match) => match.collectionSlug);
    case "offer":
    case "trade":
      return notification.payload.objekts ?? [];
    default:
      return [];
  }
}

/** The ones to draw: those whose collections are loaded, in order, three at most. None draws the tone tile. */
export function stackSlugs(slugs: readonly string[], isLoaded: (slug: string) => boolean) {
  return slugs.filter(isLoaded).slice(0, NOTE_OBJEKTS);
}
