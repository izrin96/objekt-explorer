## Context

See proposal.md for why. Today's four styles, by site:

- **Server-translated** (`context.messages.*`): `routers/compare.ts` (4), `routers/cosmo-link.ts` (6), `routers/profile.ts`, `routers/user.ts` (2), `services/profile.ts`. These are correct in every locale today, because `paraglideMiddleware` sets the request locale, but they tie `packages/api` to the web app's Paraglide bundle through the `messages` context that `lib/orpc.ts`, `routes/rpc.$.ts` and `routes/api/v1.$.ts` each inject.
- **Hard-coded English**: `routers/{objekts,list-utils,list-crud,user}.ts`, `services/{trade,list}.ts`, `services/chat/settings.ts`. These are the ones ko and ja users see in English.
- **Reason codes**: `CHAT_REFUSALS`, `OFFER_REFUSALS`, `DELETE_REFUSALS` in `schemas/`, the moderation list in `services/moderation.ts`; thrown by `refuse`, `refuseOffer` and `refuseModeration`; read on the web through `errorReason()` (`lib/orpc-error.ts`) and translated by per-feature formatters (`features/chat/format.ts`, `features/offers/refusal.ts`, `features/moderation/actions.ts`).
- **Typed errors**: `VERIFICATION_EXPIRED` (`cosmo-link.ts`) and `REAUTH_REQUIRED` (`user.ts`), which `link-flow.tsx` and `linked-accounts.tsx` branch on with `isDefinedError`.

On the web, mutation toasts pass the server's message as the description (`onError: ({ message }) => …`): six times in `features/list/actions.ts`, and in `export-list-dialog`, `linked-card`, `discord-format-dialog` and `chat/actions`. Inline renders of `error.message` sit in `link-flow`, `edit-cosmo-dialog`, `edit-list-dialog`, `list-view` (compare) and `user-search`.

## Goals / Non-Goals

**Goals:**
- One way to throw a refusal in `packages/api`, and one way to show it in `apps/web`.
- Exhaustiveness: adding a reason code without a translation fails the type-check.

**Non-Goals:**
- Reworking the chat, offer and moderation formatters, which already translate their codes and use domain detail (`retryAt`, `objektIds`).
- Better Auth errors: the `authClient` calls in `features/auth/` and `features/account/` keep rendering Better Auth's message.

## Decisions

### Reason codes are prefixed by domain and listed per domain
New tuples live beside the existing ones in `packages/api/src/schemas/`: `LIST_REFUSALS`, `TRADE_MODE_REFUSALS`, `COMPARE_REFUSALS`, `COSMO_LINK_REFUSALS`, `PROFILE_REFUSALS`, `USER_REFUSALS`, `OBJEKT_REFUSALS`. Each code carries its domain prefix (`list_have_links_want`, `cosmo_link_rate_limit`), so one web map can key on the code alone. The current `ApiErrorKey` names become the codes unchanged, so their `m.api_errors_*` strings carry over one to one. "Not your profile" in `chat/settings.ts` joins `CHAT_REFUSALS` as `not_own_profile`, since that tuple and its formatter already serve the chat screens.

*Alternative:* bare codes like chat's (`self`, `muted`). Rejected for the new domains: the shared web map would need the domain passed in beside the error. Existing chat, offer and moderation codes stay bare, because their formatters are already per domain.

### One throw helper
`refuse(status, reason, message, data?)` in `packages/api/src/lib/refuse.ts` throws `new ORPCError(status, { message, data: { reason, ...data } })`. `reason` is typed as the union of every tuple, and `message` is the English fallback. The chat, offer and moderation helpers keep their own signatures, since they map reasons to statuses themselves; they gain no message, and oRPC's default status text serves as their fallback.

*Alternative:* oRPC typed errors (`.errors()`) everywhere. Rejected: each procedure would declare its errors, and `/api/v1`'s documented error body would change shape for every operation.

### The two typed errors keep their code
`VERIFICATION_EXPIRED` and `REAUTH_REQUIRED` stay typed errors, gaining a `data: z.object({ reason })` schema in their `.errors()` declaration. A tab loaded before the deploy still matches `error.code`; the new web code reads the reason like everywhere else.

### One web formatter for the shared codes
`apps/web/src/lib/refusal.ts` exports `refusalText(error)`. It reads `errorReason(error)`, narrows the code against the new tuples, and returns its `m.api_errors_*` string through an exhaustive `switch`. Anything else, including a code this build does not know, returns `m.api_errors_unknown()`. Toasts and inline errors call it in place of `message`. `user_failed_get_info` reads its `provider` from `data.provider`.

*Alternative:* a formatter per feature, like chat's. Rejected for these domains: their screens share codes (the compare and list views both meet list codes), and one map keeps every translation in a single exhaustive place.

### Server translation goes
`ApiMessages`, the `messages` context and `apps/web/src/lib/api-messages.ts` are removed together, since the type-check then finds every remaining reader. `packages/api` stops importing anything translated.

## Risks / Trade-offs

- [A tab loaded before the deploy shows English where it showed Korean or Japanese for the formerly server-translated refusals] → Accepted: it lasts until the tab reloads, and those refusals are rare (linking, compare).
- [A new code ships without a translation] → The exhaustive `switch` fails the type-check, and `paraglide:compile` fails when a key is missing from `ko` or `ja`.
- [Codes duplicated between the server tuple and the web switch] → The switch is typed against the tuple's union, so a code that only one side knows does not compile.

## Migration Plan

One deploy: server and client ship together, with no data migration. Rollback is a revert, since the error body only gains fields.
