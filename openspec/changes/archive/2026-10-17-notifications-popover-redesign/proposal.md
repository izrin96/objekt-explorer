# Proposal

## Why

The bell's popover is a flat list. A trade or offer row shows a tinted icon, one grey sentence and "last week": no objekt, no person, no next step. Read and unread rows look alike, and because a trade's events stop grouping once a row is read, one trade can fill the list with copies ("Transfer verified · T-89 1 of 2" three times). The approved mockup (artifact NHsDAWQDxZ7G5zS6cJSc1d) fixes both.

## What Changes

- Each row says who, what, which objekt and what next:
  - the objekts it names, or else the partner's avatar;
  - a headline with the partner in bold;
  - a monospace line of objekt names;
  - a monospace reference chip (`T-1042`, `O-881`), with a progress bar on trades;
  - a verb label ("Send now", "Review", "See matches", "Leave feedback") where the row leads to an action.
- The headings are Needs you, Today, This week and Earlier. Needs you holds a trade only while its newest note asks the reader to act: a stall reminder to the party who still owes, or a wrong copy waiting for the receiver, while the reader's Trades notifications are on. Offers never go there, because answering one writes no note to the person who answered.
- An unread row gets a leading dot, a raised background and full-contrast text. Read rows dim.
- Tiles and badges go monochrome; the glyph and the words carry the event. Colour stays on class stripes and on the want and have frames of list alerts.
- **One row per trade and per offer conversation, read or not.** The newest event leads, and "N updates" expands the rest. Rows already stored group the same way.
- Offer and trade rows show the partner's current avatar. Their current name is already shown.
- The settings link moves into the header, the footer bar goes, and the popover widens from 384 to 400 px.
- Each tab gets an empty state with an example row and a next step. All shows "You're all caught up" once nothing is unread.
- The spec's third tab is renamed "Lists", as the app already labels it.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-notifications`: the bell and popover (row content, sections, unread look, monochrome badges, grouping, tab label, empty states), and offer and trade notifications (one row per conversation or trade).

## Non-goals

- A "you send / you get" split; `objekts` carries no side.
- A live Needs you check against the trade's or offer's state.
- Unread counts per tab.
- Backfilling `objekts` on older rows; they lead with the avatar.
- A chat notification type.
- Changing alert grouping, sanction notices, or what Mark all read clears.

## Routes

The bell sits in the frame on every signed-in route: a popover from `sm` up, a full-screen sheet below it. Rows link to `/trade/mine/$tradeId`, `/messages/$id` and `/trade/for-you?match=any&list=<slug>`; settings to `/account/notifications`. No route changes.

## Impact

- `apps/web/src/features/notifications/*`, plus pure modules with tests (sections, Needs you, headline split); new strings in `en`, `ko` and `ja`.
- `packages/api`: `listNotifications` groups offer and trade rows at read time and adds the partner's avatar, through optional output fields only. No migration, no write-path change, and open tabs still parse.
- The T-89 repeats came from a manual reset of that leg in the local database, not from the verifier (design.md). No worker change.
