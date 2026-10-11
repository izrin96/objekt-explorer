## Context

See proposal.md for why. Relevant current state:
- `message_pref` (`packages/db/src/schema.ts`) holds per-user chat settings (`allow`, `chat_as`, `show_activity`), read and saved through `chat.settings` / `chat.setSettings`, and shown in `features/account/sections/messages.tsx` with switches that save at once.
- Reputation is attached to other people in three places, each read past any cache with `reputationOf(ids)`: `services/trade-feed/index.ts` (posts), `services/trade-matches/index.ts` (For you partners, past the matches cache) and `services/chat/inbox.ts` (thread partner). Active periods follow the same path.
- `fetchFeedRows` (`services/trade-feed/query.ts`) builds the feed's `WHERE` from `FeedQuery`; Only matches adds a SQL prefilter and a JS check in the page loop.
- Bun 1.4 has `Temporal` and `Intl.supportedValuesOf("timeZone")` (445 zones). Browsers can't be assumed to have `Temporal`.
- `useHydrated` and `useMinuteClock` already exist for browser-rendered relative times (For you's "updated 2h ago").

## Goals / Non-Goals

**Goals:** one tested source of truth for "is this person active at instant T"; no timezone name leaves the server for anyone but the owner; pages stay full under Active now; times correct across daylight-saving changes.

**Non-Goals:** live presence; caching active state across requests (the table is opt-in and small).

## Decisions

1. **A table of its own.** `active_hours`: `user_id` (pk, fk → user, cascade), `enabled boolean not null default false`, `time_zone text not null`, `ranges jsonb not null`, `weekend_ranges jsonb` (null when weekends don't differ), `updated_at`. A range is `{ start, end }` in minutes from local midnight, multiples of 30 in `[0, 1410]`, `start ≠ end`. A check constraint holds `jsonb_array_length(ranges) BETWEEN 1 AND 2`; the rest is validated by zod. No row means never set (shown as off with the detected timezone).
   *Alternative:* columns on `message_pref`. That table is chat settings, read on every send; active hours are read for Trade and chat display, and mixing them couples two settings pages.
2. **Pure `lib/active-hours.ts` on Temporal.** It exports:
   - `rangesSchema` / `activeHoursInputSchema` (30-minute steps, at most 2, no overlap once each range is unrolled onto a 48-hour line, a timezone accepted by `Intl.supportedValuesOf`);
   - `periodsBetween(setting, from, to)`: for each local date from the day before `from` to `to`, picks weekend or weekday ranges by that date's weekday, turns each range into a `Temporal.ZonedDateTime` start and end (end on the next date when it wraps), and returns the absolute periods overlapping `[from, to)`, merged and sorted;
   - `isActiveAt(setting, instant)`, built on `periodsBetween`.

   Local times that don't exist in a spring-forward gap resolve with Temporal's `"compatible"` disambiguation (moved later). Tests: Kuala Lumpur (no DST), London across the 25 Oct 2026 change, a range past midnight belonging to its start day across a weekday/weekend boundary, overlap rejection, and a 7-day span count.
   *Alternative:* Postgres `AT TIME ZONE` for everything. It can't be unit-tested here (tests never touch the database), and the browser would still need the periods.
3. **Others get periods, not settings.** `services/active-hours.ts` has `activePeriodsOf(userIds, now)`, which reads enabled rows and returns `Map<userId, { start: string; end: string }[]>` for `[now − 24 h, now + 7 d]`. Posts, For you partners and the chat thread partner gain `activePeriods: Period[] | null` (null when off or never set), loaded beside `reputationOf`. The owner's own `user.activeHours` read returns the timezone and ranges.
4. **Active now filters by owner ids.** When `active` is true, `browseFeed` first loads every enabled row (one small query), keeps the user ids where `isActiveAt(setting, now)`, and passes them to `fetchFeedRows` as `owners: string[]`, which adds `lists.user_id = ANY(...)` to the existing `WHERE`. An empty set returns the empty feed at once. SQL stays simple, the same tested function decides activity everywhere, and pages stay full because the filter is in the query.
   *Alternative:* recomputing activity in SQL per row. It duplicates the wrap and weekend rules in a second language with no tests.
5. **Settings API on the `user` router.** `user.activeHours` (authed read: enabled, timeZone, ranges, weekendRanges, or null) and `user.setActiveHours` (authed, partial: any of the four fields, validated against the merged result, upserting the row). A refused change returns a typed error the section shows inline.
6. **One mark component.** `features/active-hours/active-mark.tsx` renders `ActiveMark({ periods, name })` in a `Popover`; pure helpers in `active-mark-text.ts` (`markFor(periods, now)` → `{ kind: "now" } | { kind: "in", unit, value }`, and `dayBar(periods, dayStart)` → percentage segments clipped to the viewer's day) have their own tests. It renders nothing before `useHydrated`, re-renders on `useMinuteClock`, and formats times with `Intl.DateTimeFormat(getLocale(), { timeStyle: "short" })`. The mark goes in the byline column of `browse-post.tsx` and `partner-row.tsx`, and under the reputation line in `thread-header.tsx`.
7. **Account section.** `/account/trade` gets a route, a nav entry after Messages, and `sections/trade.tsx`: the switch; a timezone `Combobox` over `Intl.supportedValuesOf("timeZone")` with the detected zone first; each range as two `Select`s of 48 half-hour times, an Add range button up to two and a remove control; the Weekends differ switch revealing its own ranges. Each change calls `setActiveHours` and shows the refusal reason inline on failure, as Messages does.
8. **Browse switch.** `browse-search.ts` gains `active` (the same `"1"` → `1` preprocess as `matches`); `toBrowseInput` maps it to `active: true`; the input schema gains `active: z.boolean().optional()` (additive, old inputs still validate).

## Risks / Trade-offs

- [The browser's timezone list and the server's differ slightly] → the server is the judge; the combobox offers the browser's list and a zone the server refuses shows the refusal.
- [Periods are cut off 7 days ahead, so a mark on a page left open for a week goes stale] → React Query refetches on focus and on navigation; beyond the span, the mark shows nothing rather than a wrong time.
- [Active now loads all enabled rows per request] → opt-in, a few columns per row; if it grows, cache the active id set for a minute in Valkey.
- [Converted times still reveal the owner's UTC offset] → unavoidable once times are shown in the viewer's zone; the setting is off by default and the section says so.

## Migration Plan

1. Generate the migration with `bun run --filter=@repo/db db:generate` (additive: a new table). Applying it needs the user's approval, locally first, then production before the web and worker deploy.
2. Deploy web (the API ships inside it). Old bundles ignore the new output fields; `active` is optional.
3. Rollback: revert the code; the table can stay unused. Dropping it is a separate migration.
