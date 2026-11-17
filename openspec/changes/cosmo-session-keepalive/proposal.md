# Proposal

## Why

Connected Cosmo sessions die long before their 180 days. Measured on 2026-11-17: Cosmo ends a web session after 45 to 60 minutes without use, there is no refresh token or refresh call for web sessions, and a session touched every 30 minutes lived 3+ hours until it was left idle. Today each connect gives one sync, the one right after connecting; every 72-hour sync finds the session dead, so connected accounts stop contributing media and objekt data within an hour.

## What Changes

- The `collection-media` worker run touches each live session whose last successful use at Cosmo is 20 to 25 minutes old (a fixed per-session offset), with one `users/me` request that reads nothing from the answer. Touches go first in each run, before any sync, at most 20 a run (5 during a Cosmo backoff), inside the run's existing budget of 50 requests. Cosmo's total load from the site stays at 50 a run and 600 an hour.
- A touch's answer: success records the time as the session's last use. Cosmo's own 401 or 403 error marks the session signed out, exactly as a sync does. Any other failure changes nothing, and the next run tries again.
- `last_used_at` comes to mean the last successful Cosmo answer to the session: the sync stamps it after Cosmo answers, no longer before the request.
- The switch `COSMO_SESSION_KEEPALIVE=on` (worker only, off by default) turns touches on and off with a restart.
- The run's logs count touches, sessions found signed out by a touch (with how long each lived), sessions left untouched by the cap, and the largest idle time at a touch. This is how the session's unknown absolute lifetime gets measured.
- The Collection data section's "What we store" line adds that the sign-in is used at least twice an hour to keep it active.

## Capabilities

### New Capabilities

- `worker-cosmo-session`: keeping connected Cosmo sessions in use between syncs, within the site's fixed load on Cosmo, and recording what ends them.

### Modified Capabilities

- `web-cosmo-session`: an added requirement that the consent text names the keep-alive. The capability is added by `cosmo-qr-collection-media`, which is not archived yet, so this is an ADDED requirement, not a change to "Collection data section says what is shared" (which `cosmo-objekt-ownership-data` already modifies).

## Impact

- **Routes:** `/account/collection-data` (one consent string, en/ko/ja). No API response changes.
- **Packages:** `packages/cosmo` (a touch call that reads no body), `apps/worker` (the keep-alive phase, the sync's last-use stamp, the pure planning rules in `lib/media-sync.ts`), `apps/web` (messages), plus `docker-compose.yml`, `.env.example` and the agent docs.
- **Data:** no migration, no new column. `cosmo_session.last_used_at` changes meaning (success only); nothing reads it today.
- **Cosmo:** about 58 more `users/me` requests a day per connected account, all through the one proxy egress, inside the existing per-run budget.
- **Ops:** the owner deploys with the switch off, turns it on, reconnects, and reads the result after 24 hours and again past the next 72-hour sync.

## Non-goals

- A refresh flow, or re-authenticating a dead session without the user (Cosmo offers neither for web sessions).
- Changing the 72-hour sync interval, the sync's page budget or the backoff ladder.
- Showing last use or keep-alive state on the connected account row.
- Keeping sessions alive through a Cosmo outage longer than about 20 minutes.
- Reconnect prompts or notifications when a session dies (the row already shows Reconnect).
