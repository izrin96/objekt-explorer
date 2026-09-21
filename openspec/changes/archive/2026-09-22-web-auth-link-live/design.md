## Context

See proposal.md. `web/main` (2b3c0fbe) has the shell: `useCurrentUser`, `authClient`,
`orpc`, `useSignInSearch`, the `/login` placeholder with its `redirect` search schema, and
`/link` / `/live` placeholders. The lab's auth, account, link and live components are
fixture-driven with `useFakeSubmit`, a `useSession` flag, `store/account.ts`, `store/link.ts`
and `fixtures/live.ts`; each `notImplemented()` there names the real call it stands in for.
The website's counterparts use react-hook-form + react-aria `Form`, `sonner`, intentui, and
Stream's video SDK; their data calls (listed in proposal.md) are the contract.

## Goals / Non-Goals

**Goals:** the lab's screens on the website's calls, one feature folder per domain,
`EditCosmoDialog` reusable by C5 without knowing the link page.

**Non-Goals:** changing any Better Auth or router behaviour on the server; About/Changelog.

## Decisions

**1. Folders.** `features/auth/` (`auth-shell`, `sign-in`, `sign-in-form`, `sign-up-form`,
`forgot-password-form`, `reset-password`, `password-input`), `features/account/`
(`account-dialog/{index,general,linked-accounts,password,danger}.tsx`, `queries.ts` for
`listAccounts` under key `["accounts"]`), `features/link/` (`linked-card`, `link-flow`,
`edit-cosmo-dialog`, `banner-upload.ts`, `queries.ts`), `features/live/` (`session-list`,
`player`, `live-stage`, `live-footer`, `hooks.ts`, `queries.ts`), `lib/form.ts` (the lab's
`zodErrors`), `lib/functions/live.ts` (Start server functions), routes under
`(container)/{login,auth/*,link/*,live/*,terms-privacy}.tsx`, `api/{live-sessions,open-app}.ts`.

**2. Forms are Base UI `Form` + zod, not react-hook-form.** The lab proved the shape on
these exact forms (`zodErrors(schema, values)` feeding `<Form errors>`); every form here has
two to four fields; the mutation is a `useMutation` wrapping the `authClient` or `orpc`
call, its `error.message` (already localised by the server) rendered under the form.
`useFakeSubmit` and `copy.ts` are not ported; strings come from the `auth_*`, `account_*`,
`link_*`, `live_*`, `terms_*` messages. C6's list form decides for itself whether its size
warrants react-hook-form.

**3. Redirect after sign-in.** `isSafeRedirect(v) = /^\/(?!\/)/.test(v)`; on success
`router.history.push(redirect)` when safe, else `navigate({ to: "/" })`; then invalidate
`currentUserOptions`. `/login` `beforeLoad` does `ensureQueryData(currentUserOptions)` and
`redirect({ to: "/" })` when a user exists. `/link` and `/link/connect` `beforeLoad` redirect
to `/login` with `search: { redirect: location.href }` when there is none.

**4. Account dialog.** Lab Dialog + Tabs kept. General: name + showSocial (`user.updateAccount`),
remove picture (`removePic: true`, lab's undo kept client-side until save), change email
(`authClient.changeEmail`) as its own field group with its own submit. Linked accounts:
rows from `listAccounts` filtered of `credential`; Link = `authClient.linkSocial({ provider, callbackURL: location.href })`,
Refresh = `orpc.user.refreshProfile`, Unlink = `authClient.unlinkAccount({ accountId })`
behind `AlertDialog`. Password tab rendered only when a `credential` account exists;
`authClient.changePassword({ currentPassword, newPassword })`; confirm mismatch checked in
zod. Danger: `authClient.deleteUser()` then a toast that a confirmation email was sent.
Every success invalidates `currentUserOptions` and `["accounts"]`.

**5. Linked cards show what `currentUser.profiles` has.** That is nickname and address, so
the lab's flag badges and linked-at time are dropped rather than fetching `profile.find`
per card. Unlink = `orpc.cosmoLink.removeLink(address)` behind `AlertDialog`, then
invalidate `currentUserOptions`.

**6. `EditCosmoDialog` owns its data.** Props `{ address: string; showUnlinkNote?: boolean; children: ReactElement }`.
On open it `useQuery(orpc.profile.find.queryOptions({ input: address, enabled: open }))`,
edits a local draft of the five flags, `gridColumns` (website `validColumns` 2–18, `null`
for unset; lab's 2–8 table dropped) and the banner, saves through `orpc.profile.edit`,
invalidates `["profile", address]`-shaped keys and `currentUserOptions`. Banner:
`banner-upload.ts` reproduces the website — reject when `!acceptedFileMimeTypes.includes(type)`
or `size > MAX_FILE_SIZE`; images (not gif) go through `react-advanced-cropper` at aspect 2.4
→ `canvas.toBlob`; then `orpc.profile.getPresignedPost` → `ofetch.raw(url, PUT, body, headers { Content-Type, Content-Length, Cache-Control: CACHE_CONTROL })`
→ `edit({ bannerImgUrl: publicUrl, bannerImgType })`; remove sends both `null`. C5 renders
this dialog from the profile header with `showUnlinkNote` on.

**7. Connect flow at `/link/connect`.** The lab's `LinkFlow` stepper as a page, steps and
calls in the website's order (proposal.md); the nickname step reuses the shell's search
endpoint with `useDebouncedCallback`; `cosmoId` comes from the chosen search result; the
countdown runs from `expiresInMs`; "Open Cosmo" is an `<a href="/api/open-app?artist=…&to=…">`.
Server errors render at the step they belong to and never auto-advance. Success invalidates
`currentUserOptions` and links to `/@{$nickname}` (placeholder exists).

**8. Live.** `lib/functions/live.ts` = website's `getLiveSessionById` and `checkAccess`
against `@repo/api/services/token` and `@repo/api/env`. `/live` and `/live/$id` keep the
website's `validateSearch { token? }`, `loaderDeps`, `beforeLoad` redirect and OG head.
`features/live/player.tsx` keeps the website's Stream logic (module-level
`StreamVideoClient` with `clientEnv.VITE_LIVE_API_KEY`, `call.join()` / `leave()`,
`ParticipantView`, fullscreen hooks incl. the iOS branch) inside the lab's stage, footer,
`LiveDuration` (`formatDuration` from `lib/time.ts`, the fixed version), `ParticipantCounter`
(`text-destructive-foreground`), `VolumeControl`, `FullscreenButton`. The player route is
code-split (`lazyRouteComponent`) so the SDK never loads elsewhere. Sessions list:
`useQuery(["live-session", artistId])` → `/api/live-sessions`, staleTime 5 min, tabs from
`useCosmoArtist().selectedArtists`.

**9. Menu.** `UserMenu` gains My Cosmo (`Link to="/link"`) and Account (opens
`AccountDialog`, mounted inside `UserMenu` like `SettingsDialog`).

## Risks / Trade-offs

- [Social sign-in and link need provider callback URLs registered for `localhost:3200`] →
  smoke verifies the redirect to the provider starts; completing it is the user's manual check.
- [`deleteUser` and password reset send mail through SES] → smoke verifies the request
  succeeds and the toast; no inbox check.
- [Stream SDK is large] → lazy route component; `bun run build` chunk report in the envelope.
- [Cropper CSS must be imported once] → `import "react-advanced-cropper/dist/style.css"` in
  `edit-cosmo-dialog.tsx`, verified in the browser.
- [`/live` gate is off when `BYPASS_LIVE_KEY` is unset] → same as website; smoke uses the
  `.env` value if present, otherwise verifies the gated-off state only.

## Migration Plan

Additive; nothing deploys.
