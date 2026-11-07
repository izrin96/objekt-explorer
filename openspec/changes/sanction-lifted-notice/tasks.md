# Tasks

## 1. Write the lifted notice

- [x] 1.1 Add `chat_mute_lifted` and `trade_block_lifted` to the sanction payload's `action` enum (`packages/api/src/schemas/notification.ts`); `bun run typecheck --filter=@repo/api` and lint pass.
- [x] 1.2 In `revokeSanction` (`services/moderation/console.ts`), inside its transaction, insert a `sanction` notification for a chat mute or trade block only, with the lifted action, the original sanction's `reason`, `endsAt: null` and `group_key` `sanction-lifted:<sanctionId>`; read-only verified by reading the code path up to the insert, and lint, typecheck and build pass for `@repo/api`.

## 2. Draw it

- [x] 2.1 Add `notification_sanction_chat_mute_lifted` ("You can send messages again") and `notification_sanction_trade_block_lifted` ("Your lists show on Market and Trade again") to `en`, `ko` (합니다체) and `ja` (。 as in en), and the two cases in `sanctionText` (`features/notifications/row-text.ts`); extend `row-text.test.ts` for both actions and an unknown one still returning null; `bun test` passes.
- [x] 2.2 Give the lifted actions the shield with the success tone in `notificationTone` (`features/notifications/tone.ts`), extending `tone.test.ts`; lint, typecheck and build pass for `web`.
- [x] 2.3 Locally, revoke a chat mute and a trade block on a local test account from `/mod` and confirm the bell shows each lifted row with no revoke reason, above the original notice; revoking a ban shows none.

## 3. Docs

- [x] 3.1 Update `packages/api/AGENTS.md` if a convention changed (sanction notices' group keys), or state that none changed; `apps/web/AGENTS.md` likewise. (api: Notification groups names both keys and why; web: no convention changed.)

## Workflow follow-up

- Archive with spec sync after deploy.
