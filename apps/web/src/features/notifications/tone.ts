import type { Notification } from "@repo/api/schemas/notification";

import type { Tone } from "@/lib/tone";

export type NotificationIcon =
  | "check"
  | "clock"
  | "cross"
  | "arrow"
  | "heart"
  | "package"
  | "shield"
  | "warning";
type Toned = { icon: NotificationIcon; tone: Tone };

/** each member's own type and payload, so the switch still narrows */
type ToneInput = Notification extends infer N
  ? N extends Notification
    ? Pick<N, "type" | "payload">
    : never
  : never;

const DONE: Toned = { icon: "check", tone: "success" };
const ENDED: Toned = { icon: "cross", tone: "destructive" };

/** What happened, as an icon and a colour; the text beside it always names the event too. */
export function notificationTone(notification: ToneInput): Toned {
  switch (notification.type) {
    case "want_match":
      return { icon: "heart", tone: "want" };
    case "have_wanted":
      return { icon: "package", tone: "have" };
    case "sanction":
      return { icon: "shield", tone: "destructive" };
    case "trade":
      switch (notification.payload.event) {
        case "leg_verified":
        case "completed":
          return DONE;
        case "reminder":
        case "stuck":
          return { icon: "clock", tone: "warning" };
        case "wrong_copy":
          return { icon: "warning", tone: "warning" };
        case "wrong_copy_declined":
          return { icon: "arrow", tone: "neutral" };
        case "cancelled":
        case "failed":
          return ENDED;
      }
      break;
    case "offer":
      switch (notification.payload.event) {
        case "accepted":
          return DONE;
        case "received":
        case "countered":
          return { icon: "arrow", tone: "progress" };
        case "declined":
        case "withdrawn":
          return { icon: "arrow", tone: "neutral" };
        case "cancelled":
        case "expired":
          return ENDED;
      }
      break;
  }
  return { icon: "arrow", tone: "neutral" };
}
