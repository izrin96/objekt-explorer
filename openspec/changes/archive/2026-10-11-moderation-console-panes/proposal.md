## Why

The moderator console is two pages today: the queue at `/mod/reports`, then a separate account page at `/mod/reports/$userId`. Moving between reported accounts means going back and forth. A shared excerpt is a plain list of lines, so a moderator has to read every message to find the one that matters. The reported account's track record as a trader is missing from its signals. The mockup (`design/chat-and-trade-concepts.html`, "Moderator console · /mod/reports") puts all of this on one screen.

## What Changes

- **One screen, three panes on desktop.** The queue of reported accounts stays on the left, the open account's reports and excerpts sit in the middle, and its facts and actions sit on the right. Picking a queue row swaps the other two panes and marks the row.
- **Phones keep the two steps.** Below the desktop breakpoint, the queue and the account are still separate views: list, then detail, with "All reports" to go back.
- **Linkable selection.** The open account stays in the path (`/mod/reports/$userId`), so existing links keep working. A `report` search param, validated with zod on the route, opens and scrolls to one report on that account, so a moderator can share a link to a single report.
- **Excerpts as chat bubbles.** A shared excerpt renders as a conversation: the reported account's messages on one side, the reporter's on the other. They reuse the chat thread's bubble component. Lines from the reported account that match a scam pattern are outlined and labelled with their flag categories. Unsent messages stay visible, marked as unsent. Offer and objekt-card entries keep their current content.
- **Verified and unfinished trades in the facts.** The account's facts gain its verified-trades and unfinished-trades counts, read from the existing cached reputation. Unfinished trades are failed trades where the account didn't send its part, the strongest trading signal a moderator has. All existing signals stay.
- **Queue rows say what was shared.** Each row also shows how many of the open reports came with an excerpt. No message text appears in the queue.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `web-moderation`: the Moderator console requirement changes. It now covers the three-pane layout and phone flow, the linkable report, excerpt bubbles with flagged lines, the verified and unfinished trades facts and the queue's shared-excerpt count.

## Non-goals

- Chat thread visuals. The bubble restyle (gray own bubble, bordered other side, tail corner) belongs to `chat-thread-visual-polish`. This change only reuses the shared bubble.
- Trade cards, notifications, and the user-facing mute notice.
- **Appeals.** The mockup shows an "Appeal" button on the muted user's notice. No spec, schema or message has appeals today, so this change does not add one. It is listed as an open question in `design.md`.
- A queue of individual reports or of stalled trades. The mockup shows a "trade T-0998" row, but the queue stays grouped by reported account, as the spec says.
- Changes to what moderators can read: text still reaches them only through excerpts.
- Coloured fact values or chips. The mockup's red and amber values stay monochrome.

## Routes

`/mod/reports` (layout and index) and `/mod/reports/$userId`.

## Impact

- **`packages/api`:**
  - `services/mod-reads.ts`: `accountDossier` adds `reputation` (from `reputationOf`) and a per-entry `flagged` list on excerpts. `reportQueue` adds `sharedExcerpts`.
  - A new pure `lib/excerpt-flags.ts` with a test.
  - Output fields only. No procedure input changes, so old `/rpc` callers stay valid.
- **`apps/web`:**
  - `routes/(container)/mod/reports.tsx` becomes the pane layout and loads the queue. `reports/index.tsx` becomes the desktop placeholder. `reports/$userId.tsx` gains `validateSearch`.
  - `features/moderation/console/*` is rearranged into panes (queue, account, signals, reports).
  - The chat bubble surface is shared from `features/chat`.
  - en/ja/ko messages.
- No database, migration, worker or indexer changes.
