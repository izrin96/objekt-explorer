## Why

The shell (C2) links to `/login`, `/link` and `/live` but they render placeholders, and the
account menu has no Account or My Cosmo item. This change ports every signed-in-user
surface that does not depend on the objekt grid — sign in and sign up, password reset,
email verification, the account dialog, the Cosmo link flow and its edit dialog, live
streams, terms and privacy — so it can run in parallel with C3 and unblock C5 (which reuses
the edit dialog) and C6 (which needs a signed-in user with linked profiles).

## What Changes

- **Auth pages** from the lab (`AuthShell` card, three-state `/login`, `PasswordInput`,
  `/auth/reset-password`, `/auth/verified` with its Continue link) on `authClient.signIn.email`,
  `signUp.email`, `signIn.social`, `requestPasswordReset`, `resetPassword`. After a sign-in the
  app returns to `?redirect=` when it is a same-origin path, else `/` — the lab's redirect
  mechanism, which the website never had. `/login` redirects a signed-in visitor to `/`.
- **Account dialog** from the lab (Dialog + tabs General, Linked accounts, Password, Danger)
  on the website's mutations: `user.updateAccount`, `authClient.changeEmail`, `listAccounts`,
  `linkSocial`, `unlinkAccount`, `user.refreshProfile`, `changePassword`, `deleteUser`.
  The lab's avatar upload is dropped: the website has no upload, the picture comes from
  the social provider and can only be removed. Change email is added to General.
- **Cosmo link**: `/link` lists `currentUser.profiles` as the lab's `LinkedCard` with Edit
  and Unlink (`cosmoLink.removeLink`); `/link/connect` renders the lab's stepper on
  `/api/user/search` → `cosmoLink.checkAddress` → `generateCode` (countdown from
  `expiresInMs`) → `verifyStatusMessage`, with "Open Cosmo" through a copied
  `/api/open-app` route. `EditCosmoDialog` (lab) on `profile.find` / `profile.edit` /
  `getPresignedPost` with the website's banner upload (cropper for images, presigned PUT).
  Both routes require a session.
- **Live**: `/live` and `/live/$id` with the website's `?token=` gate as Start server
  functions, the sessions list on a copied `/api/live-sessions` route, and the Stream
  video player restyled with the lab's stage, footer, duration and controls.
  `formatDuration` comes from the lab and fixes the day/hour bug.
- **Terms and privacy** page from the lab copy via the existing `terms_*` messages.
- `UserMenu` gains My Cosmo (`/link`) and Account.

## Non-goals

- No profile page or profile header (C5); C5 imports `EditCosmoDialog` from here.
- No lists, no Discord format (C6). No objekt data anywhere.
- No About or Changelog modals (still pending the user's call).
- No change to Better Auth server config, `@repo/api`, `apps/website` or `apps/lab`.

## Surfaces covered

`apps/web` routes `/login`, `/auth/reset-password`, `/auth/verified`, `/link`, `/link/connect`,
`/live`, `/live/$id`, `/terms-privacy`; the account dialog and two menu items in the nav.
Lab: `components/auth/*`, `components/account/account-dialog/*`, `components/link/*`,
`components/live/*`, `store/{account,link}.ts`, `routes/{auth,login,link,live,live-detail,terms-privacy}.tsx`,
`lib/time.ts`. Website: `components/auth/**`, `components/link/**`, `components/live/**`,
`hooks/use-live-session.tsx`, `lib/functions/{live,profile}.ts`,
`routes/(container)/{login,auth/*,link/*,live/*,terms-privacy}.tsx`, `routes/api/{live-sessions,open-app}.ts`.

## Capabilities

### New Capabilities

- `web-auth`: sign in, sign up, social sign-in, password reset, email verified, redirect after sign-in, signed-in guard on `/login`.
- `web-account`: the account dialog — profile name and social visibility, email, linked providers, password, deletion.
- `web-cosmo-link`: listing, connecting, editing and unlinking Cosmo profiles, including banner upload.
- `web-live`: token-gated live sessions list and player.

### Modified Capabilities

- `web-shell`: the account menu gains My Cosmo and Account items (delta below).

## Impact

- `apps/web` gains `@stream-io/video-react-sdk` and `react-advanced-cropper` at the website's versions.
- ~35 new files under `features/{auth,account,link,live}`, `routes/(container)/{auth,link,live}/**`,
  `routes/api/{live-sessions,open-app}.ts`, `lib/functions/live.ts`, `lib/form.ts`, `lib/time.ts`
  (formatDuration); the five placeholder routes for login, link and live are replaced;
  `components/layout/user-menu.tsx` edited.
