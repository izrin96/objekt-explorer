## Context

See proposal.md for why. Current state:
- `chat.list` takes `{ box, cursor }`. `listConversations` selects the user's memberships in that box, keyset-paged on `(coalesce(last_message_at, created_at), id)`. The partner is `partnerOf(me)` and partner names come from `fetchPartners` after the query. `/messages` keeps `box` in `messagesSearchSchema`, and its loader preloads `conversationsOptions(box)`.
- `notifications.list` takes `{ cursor }`. `listNotifications` filters by user and retention and pages 20 at a time. The bell is a `Popover` around `NotificationPanel`, which owns the infinite query, Mark all read and the rows. `notificationKeys` is used to invalidate.
- The vendored `sheet.tsx` and `drawer.tsx` exist. `ObjektDrawer` uses `Drawer`. The Market tab (`drawer/market.tsx`) renders listing rows whose ⋯ menu calls `actions.message(item)` and `actions.offer({...})`.

## Goals / Non-Goals

**Goals:** server-side filters that keep keyset paging; one panel component for the popover and the phone sheet; a drawer bar that reuses the rows' actions.

**Non-Goals:** no full-text index, no search across boxes, no new notification types.

## Decisions

1. **Inbox search is a `WHERE` added to the existing query.** `q` is a `z.string().trim().min(1).max(50).optional()`. The SQL gains:
   ```sql
   AND (
     EXISTS (SELECT 1 FROM "user" u WHERE u.id = <partner> AND u.name ILIKE :pat)
     OR EXISTS (SELECT 1 FROM user_address a WHERE a.user_id = <partner> AND a.nickname ILIKE :pat)
     OR EXISTS (SELECT 1 FROM message x WHERE x.conversation_id = c.id AND x.card IS NOT NULL
                AND x.unsent_at IS NULL AND x.card->>'collectionSlug' ILIKE :slugPat)
   )
   ```
   `:pat` is `%q%` with `%`, `_` and `\` escaped. `:slugPat` is the same after lower-casing and turning runs of spaces into `-`, so "SeoYeon 204Z" matches the slug `…seoyeon-204z`. The existing keyset order and `LIMIT` are untouched, so paging works as it does for a box. A user's conversations are a few hundred at most, and each `EXISTS` is an indexed lookup (`message_conversation_id_idx`, the user and address primary or foreign keys), so no new index is needed now.
   *Alternative:* filter on the client over loaded pages. That misses conversations on pages not yet loaded.
   **Shown name:** the row is headed by the Chat as profile's nickname or the display name. Matching any linked address's nickname plus the display name covers every name a row can show.
2. **`q` in the URL.** `messagesSearchSchema` gains `q: z.string().trim().min(1).max(50).optional().catch(undefined)`. `loaderDeps` includes it, and `conversationsOptions(box, q)` adds it to the input, and so to the query key. The field is a vendored `Input` in an `InputGroup` with a search icon. It updates the URL with `replace: true`, debounced 250 ms, and Escape or a clear button removes `q`. Switching box keeps `q`.
3. **Notification `kind`.** `listNotificationsInputSchema` gains `kind: z.enum(["all", "trades", "alerts"]).default("all")`. The service maps `trades` to `type IN ('offer','trade')` and `alerts` to `type IN ('want_match','have_wanted')`. The mapping lives as a `const` record beside the schema, so the client's tab labels and the server agree. The cursor is unchanged. `notificationsOptions(kind)` puts `kind` in the key. Invalidation in `refetch` already uses key prefixes, so every tab refreshes after a read. The vendored `Tabs` sit inside `NotificationPanel`, local state, reset on mount, because the panel mounts on open.
4. **One panel, two containers.** `NotificationBell` checks a small `useMediaQuery("(min-width: 40rem)")` hook (add `apps/web/src/hooks/use-media-query.ts` on `useSyncExternalStore`, with server snapshot `true`). The bell only renders for signed-in users after the user query, and the popup only mounts on open, so the server snapshot never draws a mismatched layout. At `sm` and up it renders the existing `Popover`. Below that it renders the vendored `Sheet` (`side="bottom"`, full height), with the same `NotificationPanel`, given `variant="sheet"` for the header's close button and a list height of `flex-1` instead of `max-h-128`.
   *Alternative:* a `/notifications` route on phones. It adds a route and a back-stack entry for something the sheet does in place.
5. **Drawer bar from the same rows.** `market.tsx` already computes `messageable` per row. Lift the action builders into a `listingActions(item)` helper shared by the row menu and the bar. The bar is rendered by `market.tsx` as a `sm:hidden sticky bottom-0` footer inside the drawer's scroll panel, with `bg-popover border-t` and safe-area bottom padding. It targets the first row in the current sort where `messageable` is true. Its label is mono: price, `#serial` (or the estimated `~#` form via the existing serial helpers), and the seller name. The tab's list gets matching bottom padding (`max-sm:pb-24`) so the last row stays reachable.

## Risks / Trade-offs

- [Card `EXISTS` scans long text-heavy conversations] → it stops at the first matching card per conversation and runs over the user's own conversations only. If traces show it, add a partial expression index on `(conversation_id) WHERE card IS NOT NULL` in a later migration.
- [The media-query hook flips layouts if the window is resized while open] → the open state is shared, so a resize swaps the container and keeps the content.
- [The bar hides the row menu's choice of listing] → it names its listing in full, and the other rows keep their menus.

## Migration Plan

No migration. Both procedures only gain optional inputs, so old tabs keep their current behaviour. Rollback is a revert.
