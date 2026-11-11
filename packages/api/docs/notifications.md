# Notifications

Part of `packages/api/AGENTS.md`, which points here.

## Notification objekts

`writeNotes` (`services/offer/notes.ts`) fills `objekts` on every offer and trade note, in one read of the offers' creators and items, ordered by `noteObjekts` (`schemas/offer.ts`): what the reader gets first, three at most. A row written before it has none and the bell keeps its tile. `listNotifications` loads `collections` for `payload.objekts` as well as an alert's `latest`. The worker reaches it through `writeNotes`.

## Notification prefs

`notifications.prefs` returns `{ enabled, match }`: `enabled` per type (a missing row takes `NOTIFICATION_DEFAULTS`), and `match` (`any` or `mutual`, a null or missing row reading as `ALERT_MATCH_DEFAULT`) for the two list alerts. `setPref` stays the boolean switch; `setAlertMatch` writes a list alert's Off, Any or Can swap in one upsert, and Off keeps the stored `match`. `recountPartners`, `resolveTradeSides` and `mutualPartnerIds` live in `services/trade/matches/recount.ts`, which the worker imports, so it must stay clear of `services/redis`; `index.ts` re-exports them.

## Notification groups

`listNotifications` pages heads, not rows. An offer or trade row groups under its stored `group_key` (`offer:<conversationId>`, `trade:<tradeId>`); every other type keys on `row:<id>`. The SQL ranks each key's rows newest first, and only after that applies the cursor, the order and the limit to rank 1. So kind and retention filter before ranking, and an older row never becomes a head on a later page. A head carries `updates` (the rest of its group) and up to `EARLIER_LIMIT` `earlier` rows, attached by `attachEarlier` (`lib/notification-groups.ts`); both are absent when the row is alone. `writeNotes` marks a group's unread row read before inserting the new event, so no event is overwritten, a group's only unread row is its head, and marking the head read reads the group. `partner.image` is never stored: the list fills it from `loadIdentities` beside the current name. A sanction notice keys `sanction:<sanctionId>` and its lifted notice (`revokeSanction`, chat mute and trade block only) `sanction-lifted:<sanctionId>`: `notification_unread_group_uniq` refuses a second unread row under one key, and the sanction notice is often still unread when it is lifted.
