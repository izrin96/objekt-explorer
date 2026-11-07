# Design

## Context

**Where Report sits today.** Four places open `ReportDialog`, all through `useSafetyDialogs` (`features/moderation/safety-dialogs.tsx`):

| Surface | Caller | What it sends |
| --- | --- | --- |
| Person row ⋯ on Browse, For you, the person page and the post page | `SafetyMenu report` in `features/trade/person-row-view.tsx` | `userId` only, even on a post page where `focus` is set |
| Profile header | `SafetyMenu report` in `features/profile/profile-header.tsx` | `userId` |
| Conversation menu | `features/chat/conversation-menu.tsx` | `userId`, `conversationId`, `share` |
| Trade page, Report a problem | `features/offers/trade-view.tsx` | `userId`, `tradeId`, with an `attachment` line and the scam reason preset |

A post's ⋯ menu (`PostBlock`, `features/trade/post-block.tsx`) and the "+N" sheet's footer (`SideAllDialog` `actions`) have no Report. `web-moderation`'s "a Trade post's menu" describes something that does not exist yet. `PostBlock` has no signed-in flag; `PersonRow` has `signedIn`.

**What a post is.** A post has no row of its own: it is its lists. The anchor is the have or sale list of a pair, else the single list, and `post.id` on the web is the anchor's list id (`anchorOf`). `groupPosts` and `pairPosts` (`schemas/trade-post.ts`, `lib/trade-feed.ts`) group lists into posts. `fetchPostCards` (`services/trade/feed/post-cards.ts`) reads a post by either half's list id and resolves the post that holds it now. It filters through `visibleOnTrade(viewerId)`, which drops lists that are off Trade, lists of trade-blocked or banned owners, and either-way blocks.

**What the post can lose.** The owner can rename, re-describe, re-tag (a want list's Open to), unpair, take off Trade or delete a list at any time. `anonymizeUser` deletes every list of a deleted account, while `web-moderation` requires a deleted account's reports to stay as evidence. The most likely staff action on a scam report is a trade block, which makes `visibleOnTrade` hide the post.

**The report row.** `report` (`packages/db/src/schema.ts`) has `conversation_id` and `trade_id`, both `ON DELETE SET NULL`, and `excerpt` jsonb as the frozen evidence. `fileReport` (`services/moderation/report.ts`) checks the conversation and the trade before its transaction, then takes the advisory lock, checks the 24-hour and daily limits, builds the excerpt and inserts. `accountDossier` (`services/moderation/reads.ts`) maps each report for the console, and `attachedTrades` reads live trade detail for open reports only.

## Goals / Non-Goals

**Goals:**
- Staff can tell which post a Trade report is about, and what it said then, after any edit, deletion, block or sanction.
- One new nullable column, so the change lands before or after `report-help-and-reporter-note` without either rewriting the other.

**Non-Goals:**
- A post table or post history. The snapshot belongs to the report only.
- Live post cards inside excerpts. The excerpt keeps `{ kind: "post", listId }` and the console still prints "Trade post card".

## Decisions

**1. One `post` jsonb column holding the list id and a snapshot, with no foreign key.** The column is `post jsonb NULL`, shaped by `reportPostSchema` in `schemas/moderation.ts`:

```
{ listId, linkedListId | null,
  lists: [{ id, type, name, slug, description | null }]   // anchor first
  tags: PostTag[], onTrade: boolean }
```

`listId` is the anchor at report time. The column is read with `safeParse`, as `excerpt` is. Alternatives considered:

- A `post_list_id` foreign key with `ON DELETE SET NULL`, as `trade_id` has. Rejected because deleting the list or the account erases even the fact that a post was named, and every list is deleted with its account.
- Live-only, like a chat post card. Rejected because staff would lose the evidence on exactly the actions a scammer takes after a report: edit, take down, delete.
- A full snapshot with entries and thumbnails. Rejected as too heavy for a report row: the list page link shows the live objekts.

With no foreign key, the id survives the list. The id is never reused (`serial`), so a stale id can only read as deleted. A message card's `listId` already works this way.

**2. The live read for staff skips Trade visibility.** The new `staffPosts(listIds)` lives beside `fetchPostCards` in `post-cards.ts`. It reads the named lists and their pair partners by id with no `visibleOnTrade` filter, groups them with `pairPosts`, and returns, per id:

- `state`: `posted` (`discoverable` and `takesPartInTrade`), `off_trade` (the list exists otherwise) or `deleted` (no row);
- `now`: the current tags, list names and types, slug, `profileSlug` and `profileAddress`, for the list page link through `getListLinkOption`.

It deliberately shows a trade-blocked owner's post as posted: the console shows the sanction itself, and the post page would say "no longer on Trade". This is why the console links to the list page and not the post page. `fetchPostCards` stays as it is; sharing a core with a filter switch would put a "skip the safety filter" flag on the function chat calls, which is worse than about 30 lines read twice.

**3. Validation sits in the report path, before the transaction.** When `postListId` is set, `fileReport` reads that list and its pair partner:

- no row: drop the post and file the report;
- `userId ≠ input.userId`, or a type other than have, want or sale: refuse with `NOT_FOUND`, as a mismatched `conversationId` or `tradeId` is refused today;
- otherwise build the snapshot with the pure `postSnapshot(lists, namedId)` in `lib/report-post.ts`, which resolves either half to the anchor, takes tags from `tagsOf`, and normalizes descriptions through `normalizeUserText`.

Being on Trade is recorded, never required: the scammer's move is to take the post down right after the report. Reading outside the transaction matches the conversation and trade checks. A rename that lands between the read and the insert changes nothing that matters.

**4. Input.** `reportInputSchema` gains `postListId: z.number().int().positive().optional()`. A tab from before the deploy sends no such field and validates to the same data. `moderation` is not mounted on `/api/v1`. The name says what it holds; `listId` alone would read as any list.

**5. Web plumbing reuses the dialog as it is.**
- `useSafetyDialogs` gains `post?: { listId: number; attachment: string }`, beside `trade`, and sends `postListId`. `SafetyMenu` passes `post` through.
- `PersonRow` passes the focused post when `focus` is set, and nothing otherwise.
- `PostBlock` gets `signedIn` from `PersonRow` and adds Report this post… after Copy link, behind a separator, on another person's post. The item only flips a `reportMounted` state. A small child component, rendered from the first click on, calls `useSafetyDialogs` for the owner and opens the report at once. This follows the `mounted` set that holds the "+N" dialogs back. Calling the hook in `PostBlock` itself would run its mutation and block hooks for every post in a virtua feed; `reportShown` only delays the dialog's markup.
- `ReportDialog` gains one optional prop, `finalFocus`, passed to its `DialogPopup` and through `useSafetyDialogs`. The menu item that opened the dialog unmounts with the menu, so `PostBlock` passes `menuRef`, as it already does for the "+N" sheet. The `attachment` line carries "The post {name} goes with this report".

A Report item in each post menu was preferred over a post picker inside the dialog: the menu is where the viewer already is, and the dialog stays the one `report-help-and-reporter-note` also reuses.

**6. The console draws the post in a new `console/report-post.tsx`.** `ReportCard` gets one line in `reports.tsx`. The new file shows:
- the snapshot (tags with `TagBadges`, list names with their type tone, descriptions behind a `details`);
- the state as a Badge;
- "Changed since the report" when the current tags or names differ from the snapshot;
- a "Now" line with the current names;
- the list page link while the list exists.

Keeping it out of `reports.tsx` keeps the textual overlap with the help change's Reply small. `accountDossier` calls `staffPosts` once, by id, for every report on the page, resolved ones included (at most `PAGE_LIMIT`, 100). A resolved report is where staff look back when the same account comes up again, and one indexed read by primary key costs little.

## Coexistence with `report-help-and-reporter-note`

That change is uncommitted and not yet applied. Neither change edits the other's files.

| Touch point | That change | This change | Merge |
| --- | --- | --- | --- |
| `report` table | `kind`, nullable `reason`, `reply`, `replied_at`, `replied_by`, two checks, a partial unique index | `post` jsonb, nullable, no check | Disjoint columns; no check here reads `kind` or `reason` |
| Migration | its own expand-only folder | its own expand-only folder | Whichever applies second deletes its generated folder and reruns `db:generate` on the merged `schema.ts`, so its `snapshot.json` holds both changes' columns and its `prevIds` points at the other's migration. Otherwise the next `db:generate` emits the other's columns again. |
| `fileReport` | splits into a shared core and a report path; adds `fileHelp` | adds post validation and the snapshot | Validation goes in the report path, and the core's insert takes `post`. A help request never sets it. |
| `accountDossier` reports | filters `kind = 'report'`; adds `reply*`; adds `helpRequests` | adds `post` per report and one `staffPosts` call | Additive fields on the same select and map; `helpRequests` carry no post |
| `reportQueue` | rewritten for Help rows | untouched | none |
| `reports.tsx` `ReportCard` | adds Reply and the reply line | one `<ReportPost>` line under the note | small textual conflict, kept both |
| `report-dialog.tsx`, `safety-dialogs.tsx` | `HelpDialog` reuses the dialog's parts, perhaps extracting them | `ReportDialog` gains an optional `finalFocus`; `useSafetyDialogs` gains `post` and `finalFocus` | Additive props; if the parts were extracted, `finalFocus` goes on whichever component renders `DialogPopup` |
| `web-moderation` delta | ADDED only | MODIFIED "Report a user"; three ADDED requirements | no shared requirement names, so either archive order applies cleanly |

## Risks / Trade-offs

- [Descriptions up to 5,000 characters each are copied into the row] → a report holds at most two lists, and filing is capped at 20 reports a day per user. A report already stores up to 200 messages.
- [An idle post (30 days unbumped) reads as posted, though Browse leaves it out] → the state answers whether the owner still offers it, which is what staff weigh. Idle is a feed rule.
- [A reporter sees the dialog with a post that was just deleted, and the report files without it] → this is rare, and the report and its note still land. Refusing would lose a report the user meant to send.
- [Each post in a feed holding report hooks] → the hooks live in a child mounted on the first click only (Decision 5).
- [A reporter can name a list that never was on Trade] → the snapshot records `onTrade: false`, so staff see it. The list is the reported account's own either way, so this exposes nothing.

## Migration Plan

1. One Drizzle migration: `ALTER TABLE report ADD COLUMN post jsonb`. It is expand-only. The running code never reads or writes it.
2. Deploy. An old tab files reports without a post, as before.
3. Rollback: revert the code and leave the column. Nothing else reads it.

Applying the migration (local, then production) is the user's call.

## Decisions taken

The user chose the recommended option (a) of all six on 2026-11-06. The alternatives stay below for the record.

1. **What the snapshot keeps.**
   - (a) Tags, list names, types and slugs, descriptions, and whether the post was on Trade. *Recommended:* descriptions are where off-site payment and "send first" text sits on a post.
   - (b) The same without descriptions, which keeps the row small.
   - (c) No snapshot; live only. This loses everything on deletion.
2. **A list named for the report that isn't the reported account's.**
   - (a) Refuse with `NOT_FOUND` when it belongs to someone else or is not a trade list, and drop it, still filing, when it no longer exists. *Recommended:* this matches the trade and conversation checks without losing a real report.
   - (b) Always drop and file.
   - (c) Always refuse, including a deleted list.
3. **The row's Report… on Browse, For you and the person page.**
   - (a) It names no post. *Recommended:* the row's lead post depends on the viewer's matches, so it would be an arbitrary pick, and each post now has its own Report.
   - (b) It names the lead post, as the row's Message does.
4. **Report in the "+N" sheet's footer.**
   - (a) Leave it out. *Recommended:* the footer carries the post's primary actions, and Report sits in the ⋯ menu beside the sheet.
   - (b) Add Report this post… as a ghost button after Close.
5. **How the console draws the live post.**
   - (a) A compact text block (tags, names, state, what changed) plus a list page link. *Recommended.* Chat's `PostCardMessage` needs collection metadata hydrated for its thumbnails and an objekt drawer the console lacks, and its `mine` flag picks the post page link, which hides a trade-blocked owner's post.
   - (b) Reuse `PostCardMessage` with `collections` merged into `tradeCollections` and a no-op `onOpen`.
6. **Whether the named post must be on Trade.**
   - (a) Record whether it was on Trade, and never require it. *Recommended:* nothing records a list's past time on Trade, a stale tab can show a post the owner took down a minute ago, and taking the post down right after being reported is the scammer's move.
   - (b) Refuse unless the list is on Trade at report time. This is stricter, but it loses reports in that race and gives the owner a way to dodge.
