## 1. Read before editing

- [x] 1.1 Invoke `better-auth-best-practices`, `tanstack-start-best-practices`, `vercel-react-best-practices`, `baseline-ui`; read this change's `design.md` and the five spec files, `openspec/config.yaml`, the lab and website files under "Surfaces covered" in `proposal.md`, `packages/api/src/routers/{cosmo-link,user,profile}.ts`, `packages/api/src/services/auth.ts` (exports + `additionalFields`), `apps/web/src/components/layout/user-menu.tsx`; verify by listing, per lab `notImplemented()` in these areas, the real call that replaces it.

## 2. Foundations

- [x] 2.1 Add `@stream-io/video-react-sdk` and `react-advanced-cropper` to `apps/web/package.json` at the website's versions (plus `@repo/lib` if `media.ts` is not yet reachable); `bun install`; verify single versions in `bun pm ls`.
- [x] 2.2 Create `lib/form.ts` (lab `zodErrors`), ensure `lib/time.ts` exports the lab's fixed `formatDuration`, add `isSafeRedirect` and `validColumns` to `lib/utils.ts`; verify `typecheck` passes and `formatDuration(25h03m)` renders one day, one hour, three minutes in a quick `bun -e` check.

## 3. Auth

- [x] 3.1 Port `features/auth/*` from the lab onto `authClient` per design decisions 2–3 and replace `(container)/login.tsx` (keep its `redirect` schema, add the signed-in `beforeLoad`); verify wrong-password shows the server message, sign-in with `?redirect=/market` lands on `/market`, `?redirect=//evil` lands on `/`, and a signed-in visit to `/login` redirects to `/`.
- [x] 3.2 Add `(container)/auth/reset-password.tsx` (`token: z.string().min(1)`, not-found on missing) and `(container)/auth/verified.tsx` with Continue; verify `/auth/reset-password` without token shows not-found and `/auth/verified` links to `/`. **read-only verified**: the reset submit itself was not fired (no real token used).

## 4. Account

- [x] 4.1 Build `features/account/account-dialog/*` per decision 4 and mount it from `UserMenu` with the Account item; verify rename updates the menu header without reload, change email submits, Password tab is hidden for a social-only account and shown for an email account, mismatched confirmation is rejected before any request. **read-only verified**: mismatch rejection proven with zero network egress; rename / change-email submits were not fired; Password-tab-hidden was not observable (no social-only account available).
- [x] 4.2 Linked accounts tab on `listAccounts` / `linkSocial` / `unlinkAccount` / `refreshProfile`; verify the rows reflect the real linked state, Link starts the provider redirect, Unlink behind confirmation refreshes the list, and Danger's Delete sends the request and shows the email toast. **read-only verified**: rows render from the real `listAccounts` read; Link / Unlink / Refresh / Delete were not fired.

## 5. Cosmo link

- [x] 5.1 Replace `(container)/link.tsx` with `link/index.tsx` (guard, `LinkedCard` list from `useUserProfiles`, Unlink via `removeLink`, button to `/link/connect`) and add `UserMenu` My Cosmo; verify signed-out `/link` → `/login?redirect=/link`, cards match the account's profiles, Unlink removes a card without reload. **read-only verified**: guard and empty-profile list verified live; `removeLink` was not fired and no card was rendered (test account has no linked profile).
- [x] 5.2 Add `(container)/link/connect.tsx` with the lab stepper on the website's call order (decision 7) and `routes/api/open-app.ts`; verify against a real Cosmo nickname: already-linked address shows the server message at step 2, a code is issued with a countdown from `expiresInMs`, Open Cosmo yields a `cosmo://` redirect, and verify-before-status shows the code-not-found message without advancing. **partly read-only**: already-linked refusal and the issued code + countdown were observed live (`generateCode` ran — see envelope); `verifyStatusMessage` was not fired.
- [x] 5.3 Build `features/link/edit-cosmo-dialog.tsx` + `banner-upload.ts` per decision 6 and wire Edit on each card; verify the dialog loads the real flags, saving a flag change persists (reload), gridColumns accepts 2–18 or unset, a JPEG crops and uploads (network shows the presigned PUT with Cache-Control) and the saved banner URL is under `profile-banner/`, an oversized file is refused before upload, and Remove clears the banner. **read-only verified**: oversized and unsupported-type refusals and the 2–18 column set unit-checked; the dialog was never opened (no linked profile) and no `profile.edit`, presign or PUT was fired.

## 6. Live and terms

- [x] 6.1 Add `lib/functions/live.ts`, `routes/api/live-sessions.ts`, `features/live/{session-list,queries}.tsx` and replace `(container)/live/index.tsx` with the gate + notice + list; verify `/live` without token shows only the notice, with the `.env` bypass token shows artist tabs and cards carrying `?token=`, and `/live/abc` without token redirects to `/live`.
- [x] 6.2 Add `(container)/live/$id.tsx` (lazy route component) with `features/live/{player,live-stage,live-footer,hooks}.tsx` per decision 8; verify an in-progress session plays with mute/volume/fullscreen and a running duration, an ended session shows the ended layout, an unknown id shows not-found, and the SDK chunk is absent from the `/` page's network requests. **not fully verifiable**: Cosmo returned zero sessions for every selected artist during the pass, so no player or ended layout could be exercised; unknown id → not-found and the SDK chunk split were verified.
- [x] 6.3 Replace `(container)/terms-privacy.tsx` with the lab page on `m.terms_*`; verify it renders in en and ko.

## 7. Verify

- [x] 7.1 `bun run lint --filter=web` (0/0), `bun run typecheck --filter=web`, `bun run build --filter=web` (note the Stream chunk size), `bun run knip`, `git status --short` limited to `apps/web/**`, `bun.lock`, this change's `tasks.md`; record in the envelope.
- [x] 7.2 Browser pass at 390 px and 1280 px in both themes of `/login` (three states), the account dialog (four tabs), `/link`, `/link/connect`, `/live`, `/terms-privacy` with the dev overflow guard silent; record what was opened.
- [x] 7.3 Comment audit over `features/{auth,account,link,live}` and the new routes: only "why" comments remain.
