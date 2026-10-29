## Why

Traders can't tell whether the person they're about to message, or who just sent an offer, is around right now, so a message to someone who closed the site hours ago looks ignored. Decision D4 in `design/trade-feedback-2026-10.md` put declared hours first and live presence later; `trade-active-hours` covers the declared half and leaves live presence out. This change is the live half: a green dot on a person's avatar while they have the site open, with a switch to hide it.

## What Changes

- **Online dot.** While a person has at least one signed-in tab of the site open, a green dot sits on their avatar, with "Online" as its text alternative:
  - `/messages`: every conversation row, and the open thread's header, which also says "Online" in words;
  - `/trade` (Browse) and `/trade/for-you`: the person row header;
  - `/@<name>`: the profile header, when the profile belongs to a linked account.
  - The dot appears and disappears within 60 seconds of the person opening or closing the site.
- **A "Show when I'm online" switch** in `/account/general`, on by default, beside the show-social switch, since the dot shows across the site and not only in chat. It is independent of Show Seen and typing in Messages. It is reciprocal: turn it off and nobody sees your dot, and you see nobody's. It saves with the section's Save, like the other General settings.
- **Who sees a dot.** Only signed-in viewers. Never on the viewer's own avatar, and never between two accounts where either has blocked the other.
- **Centrifugo** turns on presence for the `user` namespace, so the server can ask whether a person's personal channel has a connection. Browsers never see raw presence; the server filters it by the rules above.

## Capabilities

### New Capabilities
- `web-presence`: what counts as online, where the dot shows, who sees it, and how fast it follows a person opening or closing the site.

### Modified Capabilities
- `web-account`: "General settings" gains the Show when I'm online switch.

## Routes

`/messages`, `/account/general`, `/trade`, `/trade/for-you`, `/@<name>` (profile).

## Non-goals

- "Last seen" times, or "Active 5 min ago".
- Idle or away detection: a tab left open in the background still counts as online.
- Pushing presence changes over the socket; viewers poll.
- Hiding from one person only; the switch is all or nothing (a block already hides both ways).
- Dots on the profile hover card, Market, list pages, offer pages or the chat request preview.
- Signed-out visitors: Browse and profiles are public, but they show no dots.
- Active hours ("Active now" / "Active in 6 h"). It stays in `trade-active-hours`; when both ship, the live dot and the declared hours sit side by side and mean different things.

## Impact

- `centrifugo/config.json`: `presence: true` on the `user` namespace. Centrifugo has to restart, both locally and on prod, before dots can show.
- `packages/db`: `user.show_online boolean not null default true` (in `auth-schema.ts`, beside `show_social`), with a generated migration. Applying it needs approval.
- `packages/api`:
  - a pure `lib/presence.ts`: the batch `presence_stats` request, the reply parser and the visibility rule, with tests;
  - a Centrifugo call that reads its reply;
  - `services/presence.ts`;
  - a `presence.online` procedure;
  - `showOnline` as a Better Auth additional field, and an optional `showOnline` on `user.updateAccount`.
- `apps/web`:
  - `features/presence/`: a watched-ids store with one poller, `useOnline`, and an `OnlineAvatar`;
  - used in `conversation-list.tsx`, `thread-header.tsx`, `trade-header.tsx` and `profile-header.tsx`;
  - the new switch in `sections/general.tsx`.
- en/ja/ko messages.
