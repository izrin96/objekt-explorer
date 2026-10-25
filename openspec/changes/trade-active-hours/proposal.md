## Why

Users asked for "a layer of timezone to indicate if you are active or not at the hour". Traders span many timezones, and a message to someone asleep looks ignored. Today nothing on a post, a For you row or a chat says when its owner is likely to answer. Mockup: `design/trade-feedback-mockup.html` §04; triage in `design/trade-feedback-2026-10.md` (decision D4: declared hours first, live presence later).

## What Changes

- **A Trade section in Account** (`/account/trade`) with an Active hours setting, off by default:
  - a timezone, detected from the browser and editable;
  - one or two daily ranges in 30-minute steps (e.g. 12:00–14:00 and 20:00–01:00); a range may run past midnight;
  - an optional second set of ranges for weekends.
  - Changes save at once, like the other account settings.
- **Shown wherever a trader is named for trading**, when they have it on:
  - the Browse post byline, the For you row byline and the chat thread header;
  - "Active now" (with a success-colour dot) inside a range, otherwise "Active in 6 h";
  - activating it opens a popover saying when they're usually active in the viewer's own time, with a 24-hour bar of their ranges over the viewer's day and a mark for now.
  - Times are in the viewer's timezone and rendered by the browser. The trader's timezone name is never sent to other people.
- **Active now on Browse**: a switch beside Only matches (`active=1`) keeps posts whose owner is inside one of their ranges right now. Posts by owners without active hours are left out while it's on.

## Capabilities

### New Capabilities
- `web-active-hours`: the Active hours setting, how it is shown on Trade and in chat, the privacy rule, and Browse's Active now filter.

### Modified Capabilities
- `web-account`: "Account page" gains the `/account/trade` section.

## Routes

`/account/trade` (new), `/trade` (Browse), `/trade/for-you`, `/messages` (thread header).

## Non-goals

- Live presence ("Online now" from the real-time connection). It's the later half of D4.
- Active hours on the profile page or the profile hover card, Market or list pages.
- Sorting or ranking by activity in For you.
- Per-weekday schedules beyond weekday and weekend.
- Notifications or reminders tied to someone's hours.

## Impact

- `packages/db`: new `active_hours` table (user, enabled, timezone, ranges, weekend ranges, updated at) and its migration. The migration needs the user's approval to apply.
- `packages/api`:
  - a pure `lib/active-hours.ts` (validation, range membership, windows for a span, with tests);
  - a service to read and save the setting and to load other users' windows;
  - `user` router procedures for the setting;
  - `trade.browse` (`active` input, windows on posts);
  - `trade.forYou` (windows on partners, read past the matches cache as reputation is);
  - chat thread partner (windows).
- `apps/web`:
  - the `/account/trade` route and section;
  - an `ActiveHours` byline mark with its popover, used in `browse-post.tsx`, `partner-row.tsx` and `thread-header.tsx`;
  - the Browse switch and `active` search param.
- en/ja/ko messages.
- Builds on `trade-one-line-rows` (byline column) and `trade-browse-facet-filters` (Browse controls row).
