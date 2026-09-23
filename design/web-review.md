# `apps/web` parity and quality review (round R, post-C6/C7)

Date: 2026-09-22
Reviewer: read-only worker on `web/main`, main checkout.

| | |
| --- | --- |
| Reference | `apps/website` @ `web/main` (`34e0e2ae`) |
| Under review | `apps/web` @ `web/main` (`34e0e2ae`) |
| Diff range for the code axis | `2f6e8f23` (merge-base with `lab/base-ui-prototype`) → `34e0e2ae`, 14 commits |
| Skills invoked | `better-interface` → `better-accessibility`, `better-layout`, `better-writing`, `better-typography`, `better-colors`, `better-ui` → `web-design-guidelines` → `code-review` axes (standards + spec) |

## How it was run

- `website` on `:3000` (`VITE_SITE_URL=http://localhost:3000 bun run --bun --env-file=../../.env vite dev` in `apps/website`; logs `/tmp/review-website.log`).
- `web` on `:3200` — the user's own `bun run dev --filter=web` was already serving 3200 from 10:13, so it was reused rather than restarted.
- Chrome via `browser-use`, three pinned tabs: website (signed out), web (the existing signed-in session), and web in a **fresh CDP browser context** (`Target.createBrowserContext`) so the signed-out comparison could be made without touching the user's session.
- Viewports 1280×900 and 390×844 (plus 320×844 for the reflow check), themes dark and light, all through `Emulation.setDeviceMetricsOverride`.
- No writes: every mutation surface was read from source only. No sign-ups, no `db:*`, no deletes.

**Environment caveat worth fixing before the next round.** The root `.env` carries `VITE_SITE_URL=http://localhost:3200`, so Better Auth's `baseURL` (`packages/api/src/services/auth.ts:70`) points at `web`. The existing `better-auth.session_token` cookie therefore resolves on `:3200` and returns `null` on `:3000`, even after restarting `website` with a matching `VITE_SITE_URL`. **No signed-in comparison of the two apps was possible**; signed-in `web` surfaces (account dialog, user menu) were checked against website *source*, not against a running signed-in website.

Severity key: **P1** blocks cutover · **P2** fix before cutover · **P3** later.

Counts: **5 P1**, **9 P2**, **17 P3** parity gaps (31 rows, plus 1 website-only defect noted for completeness); **17 UI findings** (4 HIGH, 6 MEDIUM, 7 LOW); **9 code findings**.

`better-interface` caps a consolidated review at 15 findings; this brief asked for completeness over brevity and for the findings grouped by domain, so all 17 are listed. The four escalation triggers are the four HIGH rows and come first in their domains.

---

## Parity gaps

### Filters and toolbars

| Route | Element | Website behaviour | `apps/web` behaviour | Sev |
| --- | --- | --- | --- | --- |
| `/`, `/market`, `/list/$slug`, `/@nickname` + trades/progress/stats | **Group by** + **direction** | `GroupByFilter` (`apps/website/src/components/filters/filter-groupby.tsx`) offers Artist / Class / Collection No. / Member / Season / Season+Collection No.; `GroupDirectionFilter` appears once a grouping is picked. Wired into `home/filter.tsx:41`, `market/filter.tsx:42`, `profile/filter.tsx:53`, `list/filter.tsx:52`. | No control anywhere. `group_by` / `group_dir` are parsed (`apps/web/src/features/filters/search-schema.ts:77-78`) and honoured by the grid (`apps/web/src/features/objekt/build-virtual-data.ts:61-76`), so the feature is reachable only by hand-editing the URL. | **P1** |
| `/@nickname` (collection) | **Show missing** | `MissingFilter` (`apps/website/src/components/filters/filter-missing.tsx`), wired at `profile/filter.tsx:58`. Sets `missing=true`, clears `unowned`. | No control. `unowned` / `missing` are parsed (`search-schema.ts:71-72`) and honoured by `apps/web/src/features/profile/use-profile-objekts.ts:71-79`; unreachable from the UI. | **P1** |
| `/`, `/market` | **Transferable / Combine duplicates / Disable pin** | Website offers none of the three here. Transferable and Disable pin are profile-only (`profile/filter.tsx:46,56`); Combine duplicates is profile + list only (`profile/filter.tsx:54`, `list/filter.tsx:51`). | All three render unconditionally in the Filters popover and sheet (`apps/web/src/features/filters/filter-popover.tsx:214-234`). **Verified inert**: `/?transferable=true`, `/?grouped=true`, `/?hidePin=true` and `/market?grouped=true` all return the same result count (15,548 / 9,719) and the same 28 rendered cells as the unfiltered URL. They only bump the "Filters · n" badge. | **P1** |
| `/@nickname/trades`, `/stats` | Same three switches + Edition + Color | `trades-filter.tsx` offers only Event, Artist, Member, Season, Class, Type, Collection No., Reset. `stats-filter.tsx` offers Artist, Member, Season, Class, Edition, Type, Reset. | `ProfileToolbar` renders the full `FilterPopover` on every profile tab (`apps/web/src/features/profile/profile-toolbar.tsx:87`), so Trades and Statistics also show Transferable, Combine duplicates, Disable pin and Color. | **P2** |
| `/activity` | **Type (Digital / Physical)** | `FilterOnline` in `apps/website/src/components/activity/activity-filter.tsx:33`. | No control. `on_offline` is still applied to the live feed (`apps/web/src/features/activity/activity-view.tsx:96-97`) and to the request, so the filter exists but cannot be set. | **P2** |
| `/@nickname/progress` | **Show Count** (REMOVED 2026-09-23 by user decision: the count always shows) | `ShowCountFilter` (`apps/website/src/components/profile/progress/filter-showcount.tsx`), `showCount` URL param, wired at `progress-filter.tsx:36`. | Absent — no control, no param, no schema entry. | **P2** |
| every filtering surface, desktop | **Reset filter** | `ResetFilter` is always rendered and is only *disabled* when nothing is set (`apps/website/src/components/filters/reset-filter.tsx`; every `filter*.tsx`). | Desktop has no reset button at all. The only reset is the "Clear all" text button inside `ActiveChips`, which returns `null` when there are no chips (`apps/web/src/features/filters/active-chips.tsx:139`). **Verified**: at `/?search=seoyeon`, `/market?floor_min=5` and `/?sort=season` no reset control is visible anywhere on the page — `search`, `sort`, `sort_dir`, `floor_min/max`, `group_by/dir` and `at` produce no chip. | **P1** |
| every filtering surface | **Search help** | `filter-search.tsx:79-103` renders a `?` popover explaining the 11 search operators (OR, AND, NOT, artist names, member short names, class, season, collection numbers and ranges, serial numbers and ranges) plus an example. | Not ported. The 12 `filter_search_help_*` keys exist in `apps/web/messages/en.json` but no component reads them. | **P2** |
| every filtering surface | **⌘F / Ctrl+F focus shortcut** | `filter-search.tsx:44-58` scrolls the search field into view, focuses and selects it. | Not ported (`apps/web/src/features/filters/filter-search.tsx`). | **P3** |
| `/`, `/market`, `/list/$slug`, `/@nickname` + progress/stats | **Collection No. facet** (extra in web) | Website offers `CollectionFilter` only on `/activity` and `/@nickname/trades`. | `FACETS` (`apps/web/src/features/filters/facet-controls.tsx:50-55`) puts it on every surface. Applied client-side with a note that the website narrows it server-side (`filter-utils.ts:125-129`). Superset, but it changes what "the same link" means. | **P3** |
| `/@nickname/progress` | Class facet scope | Website passes `hideEtc` so Welcome and Zero are excluded (`progress-filter.tsx:33`). | Web shows the full class list. | **P3** |
| `/`, `/market`, … | **Type** filter cardinality | Website's `FilterOnline` is single-select with an explicit **All** item (`filter-online.tsx:41-47`); one value at a time. | Web renders two independent checkboxes (`filter-popover.tsx:249-256`), so both can be ticked. Superset, different URL shape (`?on_offline=online&on_offline=offline`). | **P3** |

### Navigation and chrome

| Route | Element | Website behaviour | `apps/web` behaviour | Sev |
| --- | --- | --- | --- | --- |
| all | **Changelog** | Icon button in the nav opens a modal (`apps/website/src/components/layout/navbar.tsx:131-142`, `components/layout/changelog.tsx`). | No changelog anywhere in `apps/web/src` (grep: zero hits). | **P2** |
| all | **Analytics** | Umami loaded via the first-party proxy: `<script src="/m/s">` in `__root.tsx:109`, with `routes/m/s.ts` (cached script proxy) and `routes/m/e.ts` (event proxy that rewrites the client IP). | Neither route exists and `__root.tsx` loads no script. `VITE_UMAMI_WEBSITE_ID` is still declared in `apps/web/src/lib/env/client.ts:7` but never read — dead config. | **P2** |
| all, desktop | **Selected artist** | A dedicated nav control (`filter-selected-artist.tsx`, `navbar.tsx:106`) always visible, signed in or out. | Moved into the Settings dialog (`ArtistsSection`) and the avatar menu (`ArtistsSubmenu`). Reachable, one click deeper. Deliberate; recorded so it is not re-raised. | **P3** |
| all, ≤ `md` | **System status** and **Search user** | Both stay in the mobile nav bar (`navbar.tsx:87,104` — no width gating). | `SystemStatus` is `max-md:hidden` (`apps/web/src/components/layout/app-nav.tsx:68`) and `NavSearch`'s trigger collapses; both are reachable only inside the mobile nav sheet. Verified at 390: the header shows only Open Menu, logo, Setting, Sign in. | **P3** |
| all | **`My List` in the desktop nav** (extra in web) | Website's desktop nav is Marketplace + Activity only; My List lives in the avatar menu. | `apps/web/src/components/layout/app-nav.tsx:13-20` adds Objekts and My List, and **shows My List while signed out**, where it only bounces to `/login`. | **P3** |
| `/list`, `/link` (signed out) | Guard destination | Redirects to `/` (`apps/website/src/routes/(container)/list/index.tsx:11-13`). | Redirects to `/login?redirect=<href>` (`apps/web/src/routes/(container)/list/index.tsx:19`). Web is better; noting the divergence. | **P3** |
| `/login` | **Show password** (extra in web) | No reveal toggle. | Web adds one. Improvement. | **P3** |

### Page-level

| Route | Element | Website behaviour | `apps/web` behaviour | Sev |
| --- | --- | --- | --- | --- |
| `/@nickname`, `/list/$slug` | **Discord format over the filtered set** | `GenerateDiscordButton` is portalled into the filter row for **any visitor** and formats exactly the objekts currently on screen (`apps/website/src/components/profile/profile-objekt.tsx:258`, `components/list/list-view.tsx:269`, `components/shared/generate-discord-button.tsx:27`). | Not ported. `apps/web`'s `DiscordFormatButton` (`features/discord/discord-format-dialog.tsx:82`) is the *list-picker* generator (have-list / want-list through `orpc.list.generateDiscordFormat`) and on the profile it is gated behind `isProfileAuthed` (`features/profile/profile-header.tsx:95`). A visitor can no longer export someone's filtered collection. | **P1** |
| objekt drawer, every surface | **Artist name** | `getArtist(objekt.artist)?.title` → "tripleS" (`apps/website/src/components/objekt/objekt-attribute.tsx:82`). | Prints the raw id → **"triples"**. Three places: `apps/web/src/features/objekt/drawer/index.tsx:99` (info row), `:128` (subtitle line), `features/objekt/drawer/metadata.tsx:50`. | **P2** |
| objekt drawer | **Transferable share** | Website shows `Transferable 99.85% (670)` alongside Copies / Spin / Non-Spin. | Web shows `Minted 671 · Spun 1 · Transferable 670` — the percentage is gone. | **P3** |
| objekt drawer | Accent/Text colour, Created at | On the main attribute list. | Moved to the Metadata tab (`drawer/metadata.tsx`), which also adds Slug, Collection ID, Edition and the image URLs. Superset, one click deeper. | **P3** |
| `/activity` | **Row layout below `md`** | Three layouts: desktop `lg:flex`, tablet `md:flex lg:hidden`, and a mobile 2-line grid `md:hidden` (`apps/website/src/components/activity/activity-render.tsx:299-500`). No horizontal scrolling at 390. | One grid, `min-w-160` (640 px) inside `overflow-x-auto` (`apps/web/src/features/activity/activity-table.tsx:11-12`). **Measured at 390 px: 640 px content in a 337 px box — 47 % of every row is off-screen**, behind a scrollbar macOS hides. | **P2** |
| `/auth/verified` | Head + next action | Renders "Email has been verified" with no `<title>` and no follow-on link. | Adds the page title and a **Continue → /** link. Improvement. | **P3** |
| `/auth/reset-password` (no token) | Failure mode | Throws; the error boundary shows "Error loading data / Retry", which cannot succeed. | Renders "Page not found / Home". Improvement. | **P3** |
| not-found | Recovery | "Page not found", no link out. | Adds a **Home** link. Improvement. | **P3** |
| `/@nickname` | Wallet address | Shows the full `0xA3e6…605a7` checksum address as selectable text. | Truncated to `0×A3e6…05a7` with a Copy button; the full value is reachable only via the clipboard. | **P2** |
| `/@nickname` | Copy button name | `aria-label` is "Address copied" *before* anything is copied (website bug). | `aria-label` is "Copy". Web is correct. | — |
| `/@nickname` | **Pinned shelf** (extra in web) | Pins are hoisted to the head of the grid, no separate section. | Web adds a dedicated `Pinned` section above the grid. Deliberate lab design. | **P3** |
| `/list/$slug` | **Share** (extra in web) | No share button. | Web adds one beside Compare / Discord format / Export. | **P3** |
| Settings dialog | Field descriptions | Theme and Language each carry a `Description` (`common_settings_theme_desc`, `common_settings_language_desc`) — `apps/website/src/components/layout/settings-modal.tsx:52,74`. | `apps/web/src/features/settings/settings-dialog.tsx:69-105` drops both; only Currency keeps its description. The two keys are now unused. | **P3** |

---

## Filter matrix

Key: **●** inline control · **◐** behind the "Filters" popover / sheet · **○** absent · **—** not applicable to that surface.
Every `apps/web` cell was confirmed at runtime by opening the popover and the sheet on that route.

| Key | home | market | activity | profile collection | profile trades | profile progress | profile stats | list detail |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| | site / web | site / web | site / web | site / web | site / web | site / web | site / web | site / web |
| `artist` | ● / ● | ● / ● | ● / ● | ● / ● | ● / ● | ● / ● | ● / ● | ● / ● |
| `member` | ● / ● + chips | ● / ● + chips | ● / ● | ● / ● | ● / ● | ● / ● | ● / ● | ● / ● |
| `season` | ● / ● | ● / ● | ● / ● | ● / ● | ● / ● | ● / ● | ● / ● | ● / ● |
| `class` | ● / ● | ● / ● | ● / ● | ● / ● | ● / ● | ● *(hideEtc)* / ● *(full)* | ● / ● | ● / ● |
| `collection` | ○ / ● | ○ / ● | ● / ● | ○ / ● | ● / ● | ○ / ● | ○ / ● | ○ / ● |
| `on_offline` | ● / ◐ | ● / ◐ | ● / **○** | ● / ◐ | ● / ◐ | ● / ◐ | ● / ◐ | ● / ◐ |
| `edition` | ● / ◐ | ● / ◐ | ○ / ○ | ● / ◐ | ○ / ◐ | ● / ◐ | ● / ◐ | ● / ◐ |
| `color` + `colorSensitivity` | ● / ◐ | ● / ◐ | ○ / ○ | ● / ◐ | ○ / ◐ | ○ / ◐ | ○ / ◐ | ● / ◐ |
| `transferable` | ○ / **◐ (inert)** | ○ / **◐ (inert)** | ○ / ○ | ● / ◐ | ○ / ◐ | ● / ◐ | ○ / ◐ | ○ / ◐ |
| `grouped` (Combine duplicates) | ○ / **◐ (inert)** | ○ / **◐ (inert)** | ○ / ○ | ● / ◐ | ○ / ◐ | ○ / ◐ | ○ / ◐ | ● / ◐ |
| `hidePin` (Disable pin) | ○ / **◐ (inert)** | ○ / **◐ (inert)** | ○ / ○ | ● / ◐ | ○ / ◐ | ○ / ◐ | ○ / ◐ | ○ / ◐ |
| `locked` | — / — | — / — | — / — | ● / ◐ | — / — | — / — | — / — | — / — |
| `unowned` / `missing` | — / — | — / — | — / — | ● / **○** | — / — | — / — | — / — | — / — |
| `priced` | — / — | ● / ◐ | — / — | — / — | — / — | — / — | — / — | — / — |
| `floor_min` / `floor_max` | — / — | ● / ● | — / — | — / — | — / — | — / — | — / — | — / — |
| `sort` | ● / ● | ● / ● | ○ / ○ | ● / ● | ○ / ○ | ○ / ○ | ○ / ○ | ● / ● |
| `sort_dir` | ● / ● | ● / ● | ○ / ○ | ● / ● | ○ / ○ | ○ / ○ | ○ / ○ | ● / ● |
| `group_by` | ● / **○** | ● / **○** | ○ / ○ | ● / **○** | ○ / ○ | ○ / ○ | ○ / ○ | ● / **○** |
| `group_dir` | ● / **○** | ● / **○** | ○ / ○ | ● / **○** | ○ / ○ | ○ / ○ | ○ / ○ | ● / **○** |
| columns | ● / ● | ● / ● | ○ / ○ | ● / ● | ○ / ○ | ● / ● | ○ / ○ | ● / ● |
| `search` | ● / ● | ● / ● | ○ / ○ | ● / ● | ○ / ○ | ○ / ○ | ○ / ○ | ● / ● |
| search help popover | ● / **○** | ● / **○** | — | ● / **○** | — | — | — | ● / **○** |
| reset | ● / **○ desktop, ● sheet** | ● / **○ desktop, ● sheet** | ● / **○ desktop, ● sheet** | ● / **○ desktop, ● sheet** | ● / **○ desktop** | ● / **○ desktop** | ● / **○ desktop** | ● / **○ desktop, ● sheet** |
| event type (`type`) | — | — | ● / ● | — | ● / ● | — | — | — |
| `showCount` | — | — | — | — | — | ● / **○** | — | — |
| checkpoint `at` | — | — | — | ● Snapshot / ● Snapshot | ● / ● | ● / ● | ● / ● | — |
| Discord format | — | — | — | ● *(any visitor, filtered set)* / **○** | — | — | — | ● *(filtered set)* / ◐ *(list picker)* |

Sources: `apps/website/src/components/{home,market,activity,profile,list}/filter*.tsx` and `components/filters/*`; `apps/web/src/features/filters/{filter-bar,filter-popover,filter-sheet,facet-controls}.tsx`, `features/profile/profile-toolbar.tsx`, `features/activity/activity-view.tsx`, `features/market/market-view.tsx`, `features/list/list-view.tsx`.

---

## UI review

### Accessibility (`better-accessibility`)

| Sev | Route · element | What is wrong | Fix |
| --- | --- | --- | --- |
| HIGH | `/`, `/market` · member chip row (`apps/web/src/features/filters/member-chips.tsx`) | **62 tab stops before the search field.** Measured on `/` at 1280: 50 member chips + 3 artist chips are in the natural tab order ahead of every filter control. The website reaches the same choice in one stop (a Member dropdown). | Make the chip strip a composite widget with roving `tabindex` (arrow keys move between chips, Tab leaves the group), per the ARIA APG toolbar pattern. The `Member` combobox beside it already gives the full list to keyboard users. |
| HIGH | `/`, `/market` · member chip row | **80 % of the row is unreachable by pointer with no visible cue.** Measured: `scrollWidth 5167 px` vs `clientWidth 1046 px` (4121 px hidden). The container sets `[scrollbar-width:none]` and relies on a `mask-image` fade alone; macOS hides overlay scrollbars, so a mouse user sees a soft edge and nothing else. | Keep the fade *and* add the project's scroll affordance — either restore the scrollbar or add prev/next buttons. `better-layout`'s "hint at hidden content" and the trigger "content reachable only past a scroll edge". |
| HIGH | Account dialog · tab strip (`apps/web/src/features/account/account-dialog/index.tsx:46-60`) | The whole `<Tabs>`, `TabsList` included, sits inside `DialogPanel`, which wraps its children in a `ScrollArea` (`apps/web/src/components/ui/dialog.tsx:178-198`). **Measured at 390×600: scrolling the panel to the bottom moves the tab strip from y=141 to y=-69** — it leaves the dialog entirely, so there is no way to switch section without scrolling back up. | Lift `<Tabs>` so `TabsList` is a sibling of `DialogPanel` (or give the panel `overflow: visible` and scroll only `TabsPanel`). The comment at `:47-48` explains the horizontal scroll of the strip, which is a separate and fine decision. |
| MEDIUM | `/activity` · row grid (`apps/web/src/features/activity/activity-table.tsx:11-12`) | `min-w-160` in an `overflow-x-auto` box: at 390 px, 303 px of each 640 px row (From / To / Time) is off-screen with no visible affordance. | Adopt the website's approach — a `md:hidden` stacked row — rather than scrolling a desktop table sideways. |
| MEDIUM | Filters popover · Type and Edition rows (`apps/web/src/features/filters/filter-popover.tsx:249-268`) | Three different affordances in one 240 px list — `Switch` for the boolean rows, a cycling `Button` for Lock, `Checkbox` for Type and Edition. The checkboxes render as small unfilled circles and read as radios; nothing says Type is multi-select while the website's equivalent is single-select. | Use one control family for the boolean rows, and give the Type and Edition groups a `role="group"` with the section heading as their accessible name. |
| LOW | `/`, `/market` · artist chips vs member chips | Artist chips measure 58×26 and member chips 99×32. 26 px clears the WCAG 2.5.8 24 px floor but is under the 40 px desktop guidance, and the two rows sit adjacent at different heights. | One height for both rows. |

### Layout (`better-layout`)

| Sev | Route · element | What is wrong | Fix |
| --- | --- | --- | --- |
| HIGH | Filters popover · Lock/unlocked (`apps/web/src/features/filters/filter-popover.tsx:167`) | The button is `w-32` (128 px fixed). **Measured on `/@kimmonday?locked=true`: popover right edge 972 px, every other row's right edge 959 px, the Lock button's right edge 973 px** — it overruns the popover's inner padding and sits flush on the border. The label grows further under `ko` / `ja`. | `w-fit`, which is exactly what `apps/website/src/components/filters/filter-locked.tsx:8` uses. `better-layout`: no fixed width on a text container. |
| MEDIUM | `/`, `/market` · filter header block | Two scroll regions stack directly above the toolbar (artist chips, then member chips), then the toolbar, then the chip row — four horizontal bands before any content. The website uses two wrapped rows with no scrollers. | Collapse the artist pill group into the member strip's leading edge, or move it beside the Artist facet. |
| LOW | Mobile Filters sheet (`apps/web/src/features/filters/facet-controls.tsx:82-90`) | Every stacked facet renders its label twice: the wrapper's `<span>` and the control's own in-trigger label — the sheet reads "Artist | Artist | Member | Member | …". | Drop the wrapper `<span>` and give the control `aria-label`, or pass `label={undefined}` to the control when `surface === "stacked"`. |

### Writing (`better-writing`)

| Sev | Route · element | What is wrong | Fix |
| --- | --- | --- | --- |
| MEDIUM | objekt drawer (`apps/web/src/features/objekt/drawer/index.tsx:99,128`, `drawer/metadata.tsx:50`) | Shows the internal id **"triples"** where the product name is "tripleS". | `getArtist(objekt.artist)?.title ?? objekt.artist`, as `apps/website/src/components/objekt/objekt-attribute.tsx:82` does. |
| MEDIUM | Filters popover · Lock/unlocked | Three labels for one control: the row label is "Lock/unlocked" and the button reads "All" / "Only locked" / "Only unlocked". "Lock/unlocked" is not a noun phrase and says nothing about what the control does. Website has the same string but uses it *as* the neutral state, with no second label beside it. | Label the row "Lock state" and keep the button as the value; or drop the row label and keep the website's single-button form. |
| LOW | `/` · search placeholder (`apps/web/messages/en.json` → `filter_search_placeholder`) | "Search member, Z-code, serial…" is 30 characters in a field that renders ~24 — it truncates mid-word to "Search member, Z-code, se". With the search-help popover also missing, the syntax is now undocumented in the product. | Shorten to the website's "Quick search" and restore the `?` help popover, whose 12 strings are already in the catalogue. |
| LOW | Settings dialog (`apps/web/src/features/settings/settings-dialog.tsx:69,88`) | Theme and Language lost their explanatory descriptions; Currency kept its. Inconsistent within one dialog. | Restore `common_settings_theme_desc` / `common_settings_language_desc` or drop the Currency one. |

### Typography (`better-typography`)

| Sev | Route · element | What is wrong | Fix |
| --- | --- | --- | --- |
| LOW | toolbar controls (`apps/web/src/features/filters/filter-bar.tsx:37`, `filter-popover.tsx:56,70`) | `text-[13px]` is hard-coded in six places instead of coming from the scale; the row also mixes 12.5 px (chips, counts), 13 px (chip labels) and 13.5 px (nav) with no rule distinguishing them. | One `text-ui-sm` step for toolbar controls; keep 11 px for card meta. |
| LOW | `/@nickname` · `<h1>` | The heading's accessible name is "kimmonday Verified" — the verified badge is inside the `<h1>`. | Move the badge out of the heading, or mark it `aria-hidden` with an `sr-only` sibling. |

### Colours (`better-colors`)

No contrast failures. Measured on `/` against the actual rendered backgrounds:

| Pair | Light | Dark | Requirement |
| --- | --- | --- | --- |
| page description 13 px | 5.56 | 7.59 | 4.5 |
| card meta 11 px | 5.56 | 7.59 | 4.5 |
| nav inactive link 13.5 px | 5.51 | 7.59 | 4.5 |
| member chip label 13 px | — | 17.77 | 4.5 |
| artist chip, unselected | — | 6.20 | 4.5 |

One note, not a failure: `apps/web/src/features/filters/member-colors.ts:68-70` already records that YuBin / SeoAh / JiWoo are near-white and gives the swatch a ring; that holds in both themes.

### UI polish (`better-ui`)

| Sev | Route · element | What is wrong | Fix |
| --- | --- | --- | --- |
| MEDIUM | Sort trigger (`apps/web/src/features/filters/filter-bar.tsx:131`) | The trigger always renders `SortAscendingIcon`, whatever the direction is. With `sort_dir=desc` the trigger shows an ascending glyph next to a descending arrow on the button beside it. | Mirror the direction button's icon, or drop the icon from the trigger — the adjacent button already carries the state. |
| LOW | Sort direction button (`filter-bar.tsx:145`) | `aria-label` names the *action* ("Ascending" while descending) while the website's toggle names the *state* ("Descending" while descending). Two apps, two conventions for the same control. | Pick one; naming the state matches the rest of `apps/web` (the Lock button names its state). |
| — | `web-design-guidelines` — reduced motion | Correctly handled: one global `@media (prefers-reduced-motion: reduce)` reset at `apps/web/src/styles/app.css:295-304`, covering the verbatim registry overlays. No finding; recorded so it is not re-checked. | — |

---

## Code review

Axes: repo standards (`AGENTS.md`, `openspec/config.yaml` § `apps/web` rules) and spec (`design/web-migration-plan.md` C2–C7).

`bun run lint --filter=web` → **0 warnings, 0 errors** across 239 files. `bun run typecheck` was not re-run (no source was edited).

| File:line | Finding | Fix |
| --- | --- | --- |
| `apps/web/src/features/filters/filter-popover.tsx:214-234` | `LongTailFields` renders Transferable / Combine duplicates / Disable pin unconditionally, while Lock and Priced-only are already gated by `showLock` / `showPricedOnly`. Three switches that do nothing on `/` and `/market` (verified). | Gate them the same way: `showTransferable`, `showGrouped`, `showPin` props set by the owning surface, defaulting to `false`. |
| `apps/web/src/features/filters/active-chips.tsx:34-127, 139` | `buildChips` covers ten keys but not `search`, `sort`, `sort_dir`, `group_by`, `group_dir`, `floor_min`, `floor_max`, `unowned`, `missing` or `at`, and `ActiveChips` early-returns `null` when the list is empty — so those filters leave the user with no reset. | Either add chips for the missing keys or render the reset outside `ActiveChips`, as an always-present toolbar button matching the website. |
| `apps/web/src/features/profile/collection-view.tsx:46`, `features/list/list-view.tsx:271`, `features/market/market-view.tsx:43`, `routes/(container)/index.tsx:34` | **`ShimmerGrid` is defined four times**, three of them byte-identical (`ObjektGrid` + `columns * 3` shimmers). | One export in `features/objekt/`, taking the optional `columns` the list variant needs. |
| `apps/web/src/components/shared/banner-field.tsx` | Dead file (knip "Unused files"), and it carries the only hard-coded user-facing string left in the app — `"No banner"` at `:55`, not `m.*`. | Delete the file. |
| `apps/web/src/lib/env/client.ts:7` | `VITE_UMAMI_WEBSITE_ID` is declared but never read; the `/m/s` and `/m/e` proxy routes and the `__root.tsx` script tag were not ported. | Port the two routes and the script tag, or drop the env var. Leaving it declared makes the app look instrumented when it is not. |
| `apps/web/messages/en.json` | 817 keys against the website's 702, with **zero website keys missing** — good. But the 12 `filter_search_help_*` keys and the two `common_settings_*_desc` keys have no reader. | They are evidence of the two gaps above; restore the features rather than pruning the keys. |
| `apps/web/src/features/filters/filter-utils.ts:47,54,76,109` | Narrative comments carried over verbatim from `apps/website/src/lib/filter-utils.ts` — `// Handle serial search (e.g. #1-20)`, `// Parse target color once outside the filter loop`. `openspec/config.yaml` asks for a non-obvious *why* only; this file is not under a verbatim gate. | Drop them, or turn the range ones into a single why about the grammar the parser accepts. Overall density is 973 comment lines / 19 119 code lines (5 %) outside `components/ui`, and the rest read as genuine whys. |
| `apps/web/src/features/filters/{search-schema.ts:84, single-select.tsx:7, facet-controls.tsx:11}` | Unused exported types `FilterKey`, `SingleOption`, `FacetControlProps` (knip). `FACETS`, `FACET_KEYS`, `SORT_LABEL`, `HOME_SORTS`, `FILTER_KEYS`, `MEMBER_COLORS`, `getSortDate`, `getCollectionShortId`, `checkOverflow` are also reported, but each is used within its own module — knip flags the `export`, not the value. | Drop the three types; make the nine module-local values non-exported. Everything knip reports under `apps/web/src/components/ui/` is the cnippet registry and is exempt by `AGENTS.md`. |
| `apps/web/src/features/filters/filter-search.tsx` vs `features/filters/search-schema.ts:82` | Two different things named `FilterSearch` in one directory — a component and the schema's inferred type. `filter-popover.tsx:28` imports the type while `filter-bar.tsx:30` imports the component. | Rename the component to `FilterSearchField` (its own inner component already uses that shape). |

Spec-axis checks that **pass**: no import from `apps/website`, `apps/lab`, `intentui` or `react-aria-components` (the only matches are two prose comments); no `nuqs`, no `usehooks-ts`; no `TODO` / `FIXME` / `notImplemented`; every Zustand read goes through a selector (`apps/web/src/stores/{columns,selection,settings}.ts` and their call sites); URL state is `validateSearch` + zod throughout (`search-schema.ts`); icons are Phosphor; grids are `virtua`.

---

## Verified equal

Checked this round and matching — the next round need not re-check these.

**Routes.** The URL surface is identical file-for-file except `routes/m/e.ts` and `routes/m/s.ts` (see the analytics gap). All of `/`, `/market`, `/activity`, `/list`, `/list/$slug`, `/@nickname`, `/@nickname/{trades,progress,stats,list}`, `/@nickname/list/$slug`, `/login`, `/auth/{verified,reset-password}`, `/link`, `/link/connect`, `/live`, `/live/$id`, `/terms-privacy` and the `api/*` handlers exist in both.

**Titles and meta.** Every route compared produced the same `<title>` (`🐴 Marketplace · Objekt Tracker`, `🐴 kimmonday · Collection · Objekt Tracker`, `🐴 kimmonday · Stats · Objekt Tracker`, …). `/auth/verified` and `/auth/reset-password` gained titles in web that the website lacks.

**`/login`.** Same six controls in the same order: email, password, Sign in with Email, Forgot password, Create new account, Sign in with Discord, Sign in with Twitter (X). Same placeholders (`your@email.com`, `•••••••`). Web adds Show password.

**`/terms-privacy`.** Same copy, same single outbound link to `github.com/izrin96/objekt-explorer`.

**`/live`.** Byte-identical message: "As this feature violates Cosmo's Terms of Service, we will no longer continue offering it. Please watch the live stream on the Cosmo app instead."

**Profile tabs.** Same five tabs, same labels (Collection / Activity History / Progress / Statistics / Lists), same hrefs. `role="tablist"` present, `aria-selected="true"` correct on the active tab, `data-status="active"` on the link.

**Objekt drawer data.** Same objekt resolves to the same values in both: Season Cream02, Class Double, Type Digital, Collection No. 358Z, Copies 671, Spin 1, Non-Spin 670, background `#22AEFF`, text `#000000`, same owner (`你的公主`), same token id `29363054`, same two-entry transfer history. Web's Metadata tab is a superset (adds Slug, Collection ID, Edition, front/back image URLs). Market tab agrees on Floor $10.00 / 2 listings / 1 seller.

**Result counts.** `/` 15,548 total and `/market` 9,719 total on both, and `?member=SeoYeon` narrows to 560 on both.

**Reflow.** No horizontal page scroll at 320 px or 390 px on `/`, `/market`, `/activity`, `/@kimmonday`, `/@kimmonday/progress`, `/login`. `document.scrollWidth === clientWidth` on every one. The profile banner's `w-screen` bleed is intentional and does not create a scrollbar.

**Contrast.** No failing pair found in either theme (table above).

**Focus.** Every one of the first 22 tab stops on `/` has a visible indicator — the browser's own `outline: auto` on links and chips, a `focus-visible:ring-2` box-shadow on the icon buttons. No `outline: none` without a replacement.

**Reduced motion.** One global guard at `apps/web/src/styles/app.css:295-304`, plus `motion-reduce:` variants in the colour picker. Nothing animates unguarded.

**Mobile filter sheet.** Contains every inline facet (Artist, Member, Season, Class, Collection No.), the long-tail block, Columns and a Reset — the dev parity guard (`facet-controls.tsx:166-191`) is doing its job; no facet is desktop-only.

**i18n.** Every one of the website's 702 message keys exists in `apps/web/messages/en.json` (817 keys). No user-facing string outside `m.*` except the dead `banner-field.tsx`.

**Lint.** `bun run lint --filter=web`: 0 warnings, 0 errors.
