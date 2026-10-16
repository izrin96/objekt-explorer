# Proposal

## Why

A message with no objekt card goes to the recipient's Requests, and requests never reach the Messages icon or the bell. The only signal is the count on the Requests tab, which a user sees only after they open `/messages`. So a cold message goes unnoticed until the recipient happens to look. Requests are meant to slow spam down, not to hide it from the person it was sent to.

## What Changes

- The Messages icon in the frame SHALL show its dot when a message has arrived in the viewer's Requests since they last opened the Requests tab. A new request counts, and so does a later message in a request already waiting.
- Opening the Requests tab on `/messages` SHALL clear that dot. A request that arrives while the tab is open SHALL not bring it back.
- Requests still add no number. The Inbox unread count, and the number in the icon's label, stay as they are. While only requests set the dot, the label SHALL say new message requests are waiting, so the dot is never the only cue.
- The dot updates live over the user socket, as the unread count does now, and polls only while the socket is down.
- The point up to which requests count as seen is stored per account, so it holds across tabs and devices. This needs a new column and a migration.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-chat`: "Unread badge" gains the request dot and the label's request wording. In "Requests", the Cold message scenario changes: the recipient's Messages icon now shows the dot (it still gains no unread count).

## Non-goals

- No bell notification for requests and no new notification type or switch in `/account/notifications`.
- No number for requests on the Messages icon.
- No change to what counts as a request, to Accept or Decline, or to the Requests tab's own count.
- No push, email or browser notification.
- Opening a single request thread does not clear the dot by itself. Only opening the Requests tab does.

## Routes

- The frame's Messages icon, on every page with a session.
- `/messages?box=requests` (the Requests tab), which clears the dot.

## Impact

- `packages/db`: a nullable column on `message_pref`, plus a generated migration. Applying it to local, staging and prod needs approval. The web app must not ship before the column exists.
- `packages/api`: a query for whether unseen requests exist, a procedure that marks them seen, and the new field on the `chat_message` realtime event.
- `apps/web`: `MessagesIcon` reads the new query, the Requests box marks requests seen, live events and invalidation include the new key, and new Paraglide messages are added for the label in each locale.
