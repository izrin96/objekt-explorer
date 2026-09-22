# `apps/web` parity review — round 2 (pre-cutover)

Date: 2026-09-22. Reviewed at `157b09c7` (+ FIX6 working tree). Three read-only Opus reviewers, website `:3000` vs web `:3200`, 1280×900 and 390×844, dark and light. Full tables with `file:line` on both sides:

- `design/review-r2-browse.md` — home, market, activity, drawer, lists, compare (BR-n)
- `design/review-r2-profile.md` — profile pages, auth, account, settings, link, live (PR-n)
- `design/review-r2-shell.md` — shell, meta, i18n, server layer, deploy (SH-n)

Raw counts: P1 7 · P2 23 · P3 46. After de-duplication and removing decisions the user already took, the actionable list is below.

**Status (2026-09-22, after the P2 rounds):** every P2 row except the C8 items (SH-3, SH-6) is fixed — P2-A `5788601d` (BR-5, BR-6, BR-7, BR-8, BR-9, BR-10, BR-11, BR-14, BR-24, card controls) and P2-B merged at `9ded8bfd` (BR-12, PR-2, PR-3, PR-5, PR-6, PR-7, PR-8/SH-7, PR-14/SH-5, PR-15, PR-19/SH-8). Trade Matches was reworked beyond parity (`1ad905b0`). Outstanding from the rounds' own reviews: `pin-dnd.tsx` drop animation ignores `prefers-reduced-motion` (pre-existing); colour overrides not applied to trade-partner rows (API); registry dialog dims the drawer opened from Trade Matches.

**Status (2026-09-22, after the P1 round):** BR-1, BR-2, BR-3, BR-4/PR-10 and SH-4 fixed (`78d36352`, `13fbeb0a`). PR-1 decided by the user: web treats the Spin address as a normal client-loaded profile; the API's server-paginated path stays. SH-1, SH-2, SH-3, SH-6 move to the C8 cutover change. Also fixed in the same round from user testing: sort-direction glyphs now follow the website's mapping, Clear all is an outline button, pin/lock are the website's corner tag and check/menu sit top-right (`990414dc`).

## P1 — blocks cutover

| ID | Gap | Fix shape |
| --- | --- | --- |
| BR-1 | Website URLs comma-join array params (`?season=Atom01,Binary01`, nuqs default). Web emits repeated keys and never splits on `,`, so every shared production link with two or more values loses all but the first. | `parseSearch` accepts both forms; `stringifySearch` emits comma-joined like the website. |
| BR-2 | List entries and compare results are not tagged (`mapObjektWithTag`), so search and edition filters on `/list/$slug` and compare do nothing. | Add the `select` mapper in `list/queries.ts` and `compare/use-compare.ts`. |
| BR-3 | Rarity sort (`sort=rare`) missing on `/` and `/market`; no rarity map fetched. | Port `rare` sort + rarity query. |
| BR-4 | **Trade Matches** on have/want lists (button, modal with Have→Want / Both / Want→Have, partner disclosure list) not ported; 24 `list_trade_*` keys dead. Same feature as PR-10 (`findTradePartners`). | Port the feature — or decide to drop it and delete the keys. **User decision pending since round 1.** |
| PR-1 | COSMO Spin address profile (`/@0xD3D5…345F`) has no special case: website server-paginates it, shows the spin notice, hides tabs. Web would try to load the whole spin wallet client-side. | Port the Spin branch (server-paginated view + notice + tab removal). |
| SH-1 | No `apps/web/Dockerfile`; compose and CI build `apps/website/Dockerfile`. | C8 cutover item. |
| SH-2 | `apps/web/server.ts` defaults to port 3200; compose maps and health-checks 3000. | C8: default to 3000 in prod or set `PORT`. |

## P2 — fix before cutover

| ID | Gap |
| --- | --- |
| BR-5 | List sort menu is not list-aware (missing Serial, Duplicate, Rarity, Price). |
| BR-6 | Drawer on a profile-bound list lacks the **Owned** tab (every copy held: serial, token, received, transferable, paged, row menu). |
| BR-7 | Create/edit list forms have no **Hide serial numbers** / **Hide user** checkboxes (draft carries the fields, form renders no control). |
| BR-8 | Drawer Market tab: one request capped at 100 rows, no paging (website: infinite, 20/page). |
| BR-9 | Drawer Market row: only the converted price; website shows seller price + currency, ≈ conversion, and a link to the listing's list. |
| BR-10 | `/@nick/list` filters to bound lists only; website shows every list filed under the Cosmo (display-only lists disappear). |
| BR-11 | Sale-list card has no entry **note** popover (website: note beside the price badge). |
| BR-12 | `/activity` uses a Load-more button and no end-of-feed marker (website: auto-paging on scroll). |
| PR-2 | Nickname that equals the address is shown verbatim; website shortens to `0x1234567...` (heading and title). |
| PR-3 | `/@nick/trades` `type` filter is local state, not a URL param; dropped on navigation. |
| PR-5 | Progress: with `?artist=` alone the website shows every member's breakdown; web shows the chart, so the all-members view is unreachable. |
| PR-6 | Stats member pie counts `objekt.member` only; website counts every member of a unit objekt. |
| PR-7 | Linked accounts → Refresh fires the mutation without the "Update profile from provider?" confirm. |
| PR-8 / SH-7 | User menu **My Cosmo** is one flat link; website: submenu with every linked profile, empty state, Manage link. |
| PR-19 / SH-8 | User menu header drops the Discord / X handles. |
| PR-14 / SH-5 | `/@unknown` shows the generic "Page not found" instead of "User not found". |
| SH-3 | No `apps/web/turbo.json`; root has no `build:prod`, `build` outputs omit `.tanstack/**`. (C8) |
| SH-4 | Persisted keys renamed (`web:settings`, `web:columns`, `web:recent-users`); at cutover every visitor loses theme, wide, currency, columns, recent searches. Read the old keys once or keep the names. |
| SH-6 | knip is meant to become a gate but reports 131 unused exports, 130 in the registry `components/ui/**`; `knip.json` needs an ignore for it. (C8) |

Skipped by the user, recorded here so they are not re-raised: PR-4 stacked mobile trade rows, PR-9 full wallet address, SH-13 artist scope in settings, SH-21 home description, BR-25 grouped serial per card, SH-4 is new.

## P3 — after cutover (46)

All in the three reports. Themes: sort descriptions and side-effects (BR-13..15), drawer summary labels / unit members / edition ordinal (BR-16..18), counts and formatting (BR-19..22), select bar always visible (BR-23), Market default sort (BR-24), Set-price on the badge (BR-26); profile column toast (PR-11), pin move menu (PR-12), checkpoint time (PR-13, spec says date-only), live not-found (PR-15), loading markers on progress/stats (PR-16), absolute dates (PR-17, SH-18), trades virtualisation (PR-18), wide switch hidden below 1560 (PR-20/SH-19), banner auto-scroll (PR-21), Apollo label (PR-22), zero entries in pies (PR-23); duplicate "Open Menu" names (SH-9), theme-color meta (SH-10), scrollbar gutter (SH-11), status/search in mobile header (SH-12), `/link/connect` title (SH-14), `fetchPriority`/intrinsic size (SH-15), `ListNotFound` code-split warning (SH-16), 117 dead message keys (SH-17), ⌘K `aria-activedescendant` (SH-20), 3 untranslated ko/ja keys (SH-22), skip link (SH-23), search trigger name (SH-24), 20px gutter (SH-25), wide mode on the nav (SH-26).

## Verified equal

See each report's section. Highlights: every route exists in both; titles match except `/link/connect`; result counts match on `/` and `/market`; drawer data agrees; no horizontal overflow at 320/390; `/login`, `/terms-privacy`, `/live` copy identical; auth flows, reset password and verified pages match from source.
