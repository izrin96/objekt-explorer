# Design

## Context

`chatIdentity(accountName, addresses, chatAs)` (`lib/chat-rules.ts`) names an account. It uses the address matching `chatAs`, else the first address, else the account name. `loadIdentities` (`services/identities.ts`) feeds it from `user` joined to `message_pref.chat_as`, plus that user's `user_address` rows in link order. A link ends by setting `user_address.user_id` to null, never by deleting the row, and four writes change `user_id`:
- link, an upsert in `services/cosmo-link.ts`;
- unlink, also in `services/cosmo-link.ts`;
- staff move and staff unlink, in `services/mod-links.ts`;
- account scrub, in `services/account-anonymize.ts`.

`chat_as` came with migration `20261007100900_chat_as` on this branch. It is not on `main`, so production has never had it.

## Goals / Non-Goals

**Goals:** store the default on the link it names, guarantee at most one per account, and keep the naming rule and its fallbacks as they are.

**Non-Goals:** expand and contract for `chat_as`. Nothing deployed reads it, so one migration can both copy the choices over and drop the column.

## Decisions

1. **`user_address.is_default boolean NOT NULL DEFAULT false`**, with a partial unique index `user_address_default_idx ON (user_id) WHERE is_default`, and a check `user_address_default_linked CHECK (NOT is_default OR user_id IS NOT NULL)`. The index keeps one default per account. The check stops an unlinked row from keeping the flag even if a writer forgets to clear it.
   Rejected alternatives:
   - `user.default_address`. That is a Better Auth table, so the column would need `additionalFields`, would travel in the session, could go stale behind the cookie cache, and could keep naming an address the account no longer holds.
   - Keeping `message_pref`. That is the wrong home under a better name.

2. **Every write that changes `user_id` sets `is_default = false`.** The four writes listed in Context each get `isDefault: false` in their `set`. The link upsert sets it in both `values` and the conflict `set`, so a row re-linked by its old owner starts as not default.

3. **`cosmoLink.setDefault({ address })`.** One transaction:
   - lock the caller's user row as other link writes do (`FOR NO KEY UPDATE`);
   - clear the caller's flag;
   - set the flag on the row where `address` matches and `user_id` is the caller;
   - refuse `cosmo_link_not_yours` when no row matched, which also undoes the clear.

   Clearing first keeps the unique index happy without a deferred constraint. The procedure goes in `routers/cosmo-link.ts`, not in `openApiRouter`, because it is a write.

4. **`chatIdentity(accountName, addresses)`** reads `isDefault` from each `AddressRef`, and chooses `addresses.find(isDefault) ?? addresses[0]`. `loadIdentities` selects `isDefault` with the addresses and drops the `message_pref` join. The `chatIdentity` tests in `lib/chat-rules.test.ts` change to match.

5. **`defaultAddress` on the current user** is `chatIdentity(...).address`, which is null with no profiles. It comes from the same `loadIdentities` call `routers/user.ts` already makes. The output field is `.nullish()`, so an output cached by an older tab still parses.

6. **The migration** is generated from the schema diff, then hand-extended before the `DROP COLUMN` with:
   `UPDATE user_address a SET is_default = true FROM message_pref p WHERE p.chat_as = a.address AND a.user_id = p.user_id`.
   The `user_id` match skips stale choices, so the check and the index hold.

7. **The Trade fallback reuses `chatIdentity`.** `toPartnerIdentity` takes the account's `AddressRef`s, now carrying `isDefault` and `privateProfile`. When no matched list has a profile, it returns the default profile's identity if that profile is not private, else the account name. Trade is public, including to signed-out visitors, so a private default must not tie its address to the account there (see `packages/api/AGENTS.md`, Privacy and Trade). Chat keeps naming a private default to partners as it does today, because chat isn't public.

8. **`also` in chat.** `chatIdentity` fills `also` with the account's other linked profiles that are not private, in link order. The thread header renders them. For the one-time note, the web keeps the address it started from (`ChatTarget` of kind `profile`), and shows the note when that address differs from the identity's `address` and the thread is empty. No new server state is needed.

## Risks / Trade-offs

- A tab loaded from this branch before the deploy still sends `chat.setSettings({ chatAs })`. Zod strips the unknown key and the save succeeds without it. No production user has such a tab.
- A link upsert that skips clearing the flag would leave a re-linked row as default. Decision 2 and the check cover unlinks, but not a direct move from one account to another. Mitigation: the staff-move write sets the flag explicitly, and a task reviews every `update(userAddress)` that sets `userId`.

## Migration Plan

Apply to local, then staging, with approval. Production receives it with the branch's other migrations. Rollback: to recover choices, restore from backup. Otherwise everyone falls back to their first linked profile, which is harmless.
