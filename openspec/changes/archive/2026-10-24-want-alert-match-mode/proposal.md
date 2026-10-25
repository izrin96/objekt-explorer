# Proposal

## Why

A want-list alert fires for any one-sided match. Most of those are people who have what you want but want nothing you have, so the alerts are noise for anyone looking to swap. People should be able to choose between Any and Can swap, and Can swap should be the default.

## What Changes

- "Someone has what you want" and "Someone wants what you have" each change from a switch to a three-way choice: **Off**, **Any** or **Can swap**. Offers and Trades keep their switches.
- **Can swap** is the default for both. **BREAKING** for current users:
  - a user who never touched "Someone has what you want" moves from Any to Can swap;
  - "Someone wants what you have" was off by default, so everyone who never touched it now gets Can swap alerts;
  - a user who turned either type on also moves to Can swap, because Any was the only option when they chose;
  - a user who turned either type off stays Off.
- Under Can swap, a match alerts only when the partner is one of the people For you lists under Can swap (its Mutual) on the page the alert opens, so the alert and the page agree: after the ownership check, with swap matches only. A sale listing can never be mutual, so a want list open to buying gets no sale-list alerts under Can swap. To get them, the user picks Any.
- Mutuality is checked when the entry is first seen, then on every alert run for 24 hours, the same way an entry whose owner can't trade it yet is checked again. It alerts on the first run that finds the match mutual. After 24 hours it never alerts, even if a later list change makes it mutual.
- A Can swap alert links to `/trade/for-you?match=mutual&list=<slug>`, and an Any alert still links to `match=any`. The alert stores which choice it was made under, so changing the setting later does not change where an existing alert leads.

The choice is named Can swap, the label `rename-mutual-to-can-swap` gives For you's Mutual; this change applies after that one. Stored values and the `match=mutual` URL stay `mutual`.

Routes: `/account/notifications` (settings), the bell popover (alert targets), `/trade/for-you` (alert landing).

## Non-goals

- No per-list setting: the choice covers the whole account.
- No alert when a match turns mutual after 24 hours, or because the recipient's own have list or the partner's want list changed.
- No change to Offers, Trades or sanction notices, to grouping, to once-only, or to the exclusion rules.
- No change to For you's Mutual or Any themselves.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-notifications`:
  - Notification settings: three-way choice and new defaults;
  - Want-list alerts: Can swap filter, recheck, target by choice;
  - Reverse-direction alerts: mirrored, no longer off by default.
- `web-lists`: Want list match option. A sale entry against a Buying only want list alerts only under Any.

## Impact

- `packages/db`: a new `match` column on `notification_pref` (`any` | `mutual`, nullable, read as `mutual`), plus a new migration. Existing rows keep `enabled`.
- `packages/api`:
  - `schemas/notification.ts`: defaults, the `setPref` input, the prefs output and an optional `match` on the alert payload;
  - `routers/notifications.ts` and `services/notifications.ts`;
  - a Mutual check for the worker, built on `recountPartners` with `ownerIds` and `mutualOf`.
- `apps/worker`:
  - `want-alert-match.ts` gets the mode per recipient and an extra "not mutual yet" result for recheck;
  - `job/want-alerts/context.ts` and `index.ts`;
  - tests in `want-alert-match.test.ts`.
- `apps/web`:
  - the settings section `features/account/sections/notifications.tsx`;
  - the alert link in `features/notifications/notification-items.tsx`;
  - strings in `en`, `ko` and `ja`.
- The Mutual check adds one recount per recipient on Can swap per run, so alert-run load goes up. See design.
