## Why

`packages/api` reports a refused request four ways: a message the server translates through `context.messages` (14 sites), a hard-coded English message (15 sites), a reason code in `data.reason` that the web app translates (chat, offers, moderation, account deletion), and oRPC typed errors (2 sites). The web app renders `error.message` directly in about ten places, so the hard-coded English messages reach users of the `ko` and `ja` locales untranslated: linking a have list to a have list, an over-long user search, a checkpoint on COSMO Spin, the list form's currency and profile checks. The newest code already settled on reason codes; this change makes them the only way.

## What Changes

- Every refusal the web app can show SHALL carry a reason code in `data.reason`, declared in a per-domain `*_REFUSALS` tuple under `packages/api/src/schemas/`, as chat, offers and account deletion already do. Codes added for: lists, trade modes, compare, cosmo-link, profile, user (search and provider info) and the objekt checkpoint.
- Every refusal SHALL also carry a plain English `message`, which the web app never renders: it is the fallback for tabs opened before the deploy and for `/api/v1` callers.
- The web app SHALL render a refusal by translating its reason code through Paraglide, never through `error.message`. The existing `m.api_errors_*` strings are reused; new ones are added in `en`, `ko` and `ja`.
- Server-side translation goes: `ApiMessages`, `context.messages` and `apps/web/src/lib/api-messages.ts` are removed, and the `/rpc`, `/api/v1` and server-client contexts no longer carry `messages`.
- The two typed errors (`VERIFICATION_EXPIRED`, `REAUTH_REQUIRED`) keep their error code, so tabs opened before the deploy still branch on it, and also carry the matching reason.
- `packages/api/AGENTS.md` gains an "Errors" section stating the rule.

Routes covered: `/list` and each list page (create, edit, link, compare), `/link/connect`, the profile edit dialog, `/account/profiles` (linked accounts), the header user search, `/@{nickname}?at=…` (checkpoint), `/messages` (chat settings), and every `/api/v1` operation's error body.

## Non-goals

- Better Auth's own errors (sign in, sign up, password reset) stay as Better Auth reports them.
- Errors the user cannot cause through the UI (`NOT_FOUND` with no message, Zod input validation) keep their current shape.
- No change to HTTP status codes, to which requests are refused, or to the chat, offer and moderation refusals, which already follow the rule.
- No retry or recovery behaviour beyond what each screen does today.

## Capabilities

### New Capabilities
- `api-errors`: how a refused API request is reported (reason code, English fallback message, status) and how the web app shows it in the user's locale.

### Modified Capabilities
None. `web-cosmo-link` already requires refusals in the user's locale, and `api-openapi`'s error body (`defined`, `code`, `status`, `message`) is unchanged.

## Impact

- `packages/api`: `orpc.ts` (drop `ApiMessages` and the `messages` context), `routers/{compare,cosmo-link,profile,user,objekts,list-crud,list-utils}.ts`, `services/{profile,trade,list}.ts`, `services/chat/settings.ts`, new `*_REFUSALS` tuples in `schemas/`.
- `apps/web`: `lib/orpc.ts`, `routes/rpc.$.ts`, `routes/api/v1.$.ts`, delete `lib/api-messages.ts`; the screens that render `error.message` for an oRPC error (`link-flow`, `edit-cosmo-dialog`, `edit-list-dialog`, `list-view`, `user-search`, `chat/actions`, `linked-accounts`); `messages/{en,ko,ja}.json`.
- `/api/v1` error bodies change only in their `message` text, which becomes English for every locale.
