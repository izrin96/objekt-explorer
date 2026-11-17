# Proposal

## Why

Cosmo's public v3 metadata, which the indexer builds each collection from, lacks the motion video, band image, voice flag, back image and accent colour, and only guesses the text colour by class. A Cosmo account signed in by QR code can read its own collections with all of those fields (`GET api.cosmo.fans/bff/v3/objekt-summaries`, checked 2026-11-16). `front_media`, `band_image_url` and `has_audio` already exist on the indexer's `collection` row, but nothing writes them. Cosmo returns only the signer's own collections, so more connected accounts fill more.

## What Changes

- A new account section, **`/account/collection-data`**, where any signed-in user connects their Cosmo account: a headless Chromium on the shop's login page mints the reCAPTCHA token, and the user scans Cosmo's sign-in ticket as a QR code, then types its 2-digit code. The section first says what is stored, read and shown, and how to stop. It lists only the user's own accounts (up to 3), with Sync now, Disconnect, and Renew in a session's last 14 days.
- The session cookie is stored **encrypted** (AES-256-GCM, its own key `COSMO_SESSION_KEY`) in a new app table, with its owner, the Cosmo nickname and address (shown only to the owner) and its times. A session ends on Disconnect, on Cosmo's refusal, 180 days after connecting or renewing, when its owner deletes the account or is banned, or when someone else connects the same Cosmo account.
- A worker job reads each live session's collections every 3 days and on Sync now, within 600 Cosmo requests an hour, with backoff. It records what Cosmo returns in a new app table, then fills the indexer's `collection` row: motion video and voice flag, plus the back image, accent and text colour where the row lacks Cosmo's value, never over a staff override. About 14 days before a session expires, its owner gets one notification to renew.
- A second job copies motion and voice files into our R2 bucket, like front images; the row holds our copy, never Cosmo's URL.
- Admins see a counts-only summary on the Collections tab.
- The drawer's card plays the motion video muted and looping (still under reduced motion); Metadata gains Motion and Voice rows.
- A browser container, the `COSMO_BROWSER_URL` and `COSMO_SESSION_KEY` env vars, a QR renderer, and new private key names in the error scrubber.

## Capabilities

### New Capabilities

- `web-cosmo-session`: connecting a Cosmo account by QR code, and keeping, renewing and ending its session.
- `worker-collection-media`: filling collection media and fields from connected sessions.

### Modified Capabilities

- `web-account`: the Collection data section.
- `web-admin`: a Cosmo media summary on the Collections tab.
- `web-notifications`: the expiry notice.
- `web-objekt-browser`: motion video on the drawer's card, and motion and voice in Metadata.

## Impact

- **Routes:** `/account/collection-data` (new), `/mod/collections`, and the objekt drawer.
- **Packages:** `packages/cosmo`, `packages/lib`, `packages/api`, `packages/db` (two app tables, one generated migration), `apps/worker`, `apps/web`.
- **Data:** no indexer schema change; five existing `collection` columns are written; bucket objects under `collection-media/`.
- **Ops:** a browser container and new secrets on the VPS; the migration and first real scan are owner steps.

## Non-goals

- Transferability or grid-lock sync, and showing recorded band images (the web keeps its hardcoded ones): follow-ups.
- Refreshing a session through Cosmo, which offers none: Renew is a fresh connect.
- Linking a Cosmo profile by QR code: a connect creates no profile link.
- Motion on grid cards; sound on the drawer's video.
- Background colour: v3 metadata already carries Cosmo's.
- Showing who shared a collection's media, or anyone's connected Cosmo account, to anyone but its owner.
