# Design

## Context

`applyModAction` (`packages/api/src/services/moderation/console.ts`) inserts a `sanction` notification for a warn, chat mute or trade block, with `group_key` `sanction:<sanctionId>`. `revokeSanction` in the same file stamps `revoked_at`, writes the audit entry, and calls `publishNotify` so open tabs refetch, but writes no notification. The web draws a sanction row through `sanctionText` (`features/notifications/row-text.ts`); `renderable` drops a row whose text is null, so a tab from before a new action skips it. `notificationTone` gives every sanction the shield in the destructive tone.

## Goals / Non-Goals

**Goals:** the lifted notice of the spec delta, written in the revoke's transaction, safe for open tabs from before the deploy.

**Non-Goals:** marking the original sanction notice read; a lifted notice for a ban; notices for a sanction that ends by time.

## Decisions

- **New action values, not a flag.** The payload's `action` gains `chat_mute_lifted` and `trade_block_lifted`. A `lifted: true` flag on `chat_mute` would make an old tab draw "You can't send messages" for a lift; an unknown action makes its `sanctionText` return null, so `renderable` skips the row until reload.
- **Reason stays in the payload, unshown.** `reason` remains a required string; the lifted row stores the original sanction's reason (already shown to the user), never the revoke reason, and the text ignores it. Making `reason` optional would widen every reader for no gain.
- **Its own group key.** `notification_unread_group_uniq` is unique on `(user_id, group_key)` while unread, so reusing `sanction:<id>` conflicts while the sanction notice is still unread. The lifted row uses `sanction-lifted:<id>`; sanction rows are never grouped anyway (the list keys them `row:<id>`).
- **Inside the revoke transaction.** The insert joins the existing `db.transaction` in `revokeSanction`, so a failed insert revokes nothing and a revoke never lacks its notice. The existing `publishNotify` after commit already tells open tabs.
- **Tone.** Lifted actions get the shield with the success tone (`DONE`'s tone, shield icon), the existing tone set rather than a new one; the tile stays grey as for every row.

## Risks / Trade-offs

- [The unread mute notice still reads "You can't send messages" under the lifted one] → the lifted row is newer and on top; marking the old one read would hide that a sanction happened, which the user may want to see.
- [A moderator revokes by mistake and re-applies] → the user sees lifted, then a new sanction notice; acceptable, and the audit log has both.

## Migration Plan

No migration. Deploy web (the API ships in the web image). Rollback: a lifted row left in the table is skipped by the old build's `renderable`.
