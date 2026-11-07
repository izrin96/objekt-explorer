# Proposal

## Why

A report filed from Trade names only the account. Staff reading it in the console cannot tell which post prompted it. The post can also change after the report: the owner can edit it, take it off Trade or delete it, and deleting the account deletes every list. Today Report on Trade sits only in a person's row menu; a post's own ⋯ menu has none, although `web-moderation` already claims one.

## What Changes

- **Report this post…** joins the ⋯ menu of another person's post on Browse, For you and the person and post pages, for a signed-in viewer. It opens the usual report dialog with a line naming the post.
- **On a post page**, the row's Report… names that post, as the row's Make offer and Message already address it. Elsewhere the row's Report… names no post.
- **The report keeps the post.** `moderation.report` takes an optional `postListId`. The server checks that the list belongs to the reported account and is a have, want or sale list; another account's list is refused, and a list deleted before the report goes through is left off while the report still goes through. The report stores a small snapshot of the post as it stood: its tags, its lists' names and types, its descriptions, and whether it was on Trade.
- **Staff see the post.** On the console's account page, a report that names a post shows it as reported and as it stands now: still posted, taken off Trade, or deleted. They see it whatever blocks or sanctions hide it from Trade, they see a mark when it has changed since the report, and they get a link to the list.
- The 24-hour limit stays per account: a second post by the same person inside it is refused, as a second report is today.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-moderation`: Report a user lists where Report sits and when it names a post; a new requirement covers reports with a Trade post attached, both filing and the console.
- `web-trade-browse`: the post menu gains Report this post…, including in the scenarios that list a menu's items.
- `web-trade-person-pages`: the post page's row Report names that post.

## Non-goals

- Report in the "+N" sheet's footer (open decision in design.md).
- Naming a post from a conversation, a profile or the trade page. Their reports stay as they are, and a conversation's excerpt keeps post cards as it does today.
- Live post cards in excerpts.
- Changing the queue rows, reasons, limits or sanctions.
- Block on a post's menu; Block stays a row action.
- Hiding or removing a reported post. Staff act on the account, as today.

## Routes

- `/trade`, `/trade/for-you`, `/trade/@<handle>`, `/trade/@<handle>/<slug>` (Report this post…, and the post page's row Report…)
- `/mod/reports/$userId` (the post on each report)

## Impact

- `packages/db`: `report` gains one nullable `post` jsonb column. The migration is expand-only and separate from `report-help-and-reporter-note`'s.
- `packages/api`: `reportInputSchema` gains the optional `postListId`. `fileReport`'s report path validates the list and snapshots the post. A pure `postSnapshot` lives in `lib/` with a test. A staff post read ignores Trade visibility, and `accountDossier` returns `post` on each report.
- `apps/web`: `useSafetyDialogs` and `SafetyMenu` take an optional `post`, and `ReportDialog` an optional `finalFocus`. `PostBlock` gets the Report item, `PersonRow` passes the focused post, and a new `console/report-post.tsx` draws it. New Paraglide strings in en, ko and ja.
- `/rpc` compatibility: an open tab sends no `postListId` and validates as before. `moderation` is not on `/api/v1`.
