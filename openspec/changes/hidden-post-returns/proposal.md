# Proposal

## Why

On 2026-11-10 a user asked whether a post they hid would show again once its owner adds objekts they want. Today it does not: a hide lasts until the user unhides the post or the owner deletes its lead list, and entries added later never reach the user's feed, counts or alerts. The user reads a hide as "this content is not for me", so new content that matches should get a new chance.

## What Changes

- A hidden post comes back by itself when its owner adds an entry, after the hide, that matches a list of the user who hid it, in either direction: an objekt the user wants on the post's have or sale list, or a collection the user offers on the post's want list.
- The match must be real when it is read: the offering side can trade a copy and the wanting side holds none, as a want-list alert requires. An entry not owned yet is read again for 24 hours, as alerts are.
- It follows the match alone. The user's alert settings (Off, Any, Can swap) decide only whether a notification is also sent.
- Entries that were on the post when it was hidden never bring it back.
- The want-alerts job does this: it already pairs each new entry with the lists it matches. It now reads pairs from a hidden post when the entry is newer than the hide, and deletes the hide in the same transaction as the run's alerts.
- The Hidden dialog and Account's Hidden page say a hidden post comes back this way.

## Non-goals

- A hidden person stays hidden whatever they add.
- No new notification type, and no "this post is back" notice: the post is listed again, and the ordinary want-list alert is sent when the user's settings allow it.
- No change to what Browse and For you count while a post is hidden.
- No switch to keep a post hidden for good. Hiding the person does that.
- No schema change and no migration.

## Routes

- `/trade` (Browse) and `/trade/for-you`: where the post is listed again.
- `/account/hidden` and Browse's Hidden dialog: the description.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-trade-for-you`: Hide a post names the third way a hide ends; adds A hidden post comes back.
- `web-notifications`: Want-list alerts skip hidden posts now covers only entries from before the hide.

## Impact

- `apps/worker/src/job/want-alerts/` (`pairs.ts`, `record.ts`, `index.ts`) and `apps/worker/src/lib/want-alert-match.ts` with its test.
- `packages/api/src/services/trade/lists.ts`: `hidesOfSql` and `hiddenPostAtSql` beside `inHiddenPostSql`.
- `apps/web/messages/{en,ko,ja}.json`: one sentence added to `trade_hidden_description`.
- `apps/worker/AGENTS.md`, `packages/api/docs/trade.md`.
- Runs on production data once the worker is rebuilt on the VPS: hides older than a matching new entry start to be removed from the first run after deploy. Entries added before the deploy are not re-read, apart from those already waiting in the 24-hour recheck list.
