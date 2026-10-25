# `apps/lab` code review — round 29

Date: 2026-09-21. Scope: every file under `apps/lab/src` (141 files, ~21 k lines including
`fixtures/collections.json`), plus `index.html`, `vite.config.ts` and `package.json`.

The lab is about to become the reference for migrating `apps/website` off react-aria-components,
so this round is a refactor pass, not a feature round: **nothing here may change what the app
looks like or how it behaves.** Items that would require a product decision, or that are a
concern for the website port rather than for the lab, are tagged `defer` and left alone.

Baseline before the round: lint 0 errors / 2 warnings, typecheck pass, build pass.

**Totals: 45 items — 33 `fix-now`, 12 `defer`.**

---

## 1. Duplication left by parallel rounds

| # | Where | Problem | Fix | Tag |
| --- | --- | --- | --- | --- |
| 1.1 | `components/filters/filter-bar.tsx:164`, `components/profile/profile-toolbar.tsx:98` | The search field — wrapper, absolutely positioned glyph, `pl-6!`, placeholder — is written out twice, character for character, including the round-13 padding budget that is easy to get wrong. | One `FilterSearch` component next to the other filter controls; both toolbars render it. | fix-now |
| 1.2 | `components/filters/filter-sheet.tsx:28`, `components/profile/profile-toolbar.tsx:39` | `NO_EXTRAS` (the frozen empty array the memoised key list depends on) is declared twice. Two identities defeat the point of having a shared constant at all. | Export one `NO_EXTRAS` from `filters/facet-controls.tsx`, where `ExtraFacet` lives. | fix-now |
| 1.3 | `components/objekt-drawer.tsx:89`, `routes/activity.tsx:32` | Two `EVENT_COLOR` maps carrying the same three tokens, keyed on different casings (`"mint"` vs `"Mint"`). Round 26 had to fix the same token bug in both. | One `EVENT_COLOR` in `lib/objekt.ts`, keyed lowercase; Activity lowercases its label when reading it. | fix-now |
| 1.4 | `components/nav-search.tsx:26-41` | Private `readRecent` / `writeRecent` duplicating `lib/local-storage.ts`'s `readStringArray` / `writeStringArray` — and missing their shape check, so a hand-edited `lab:recent-users` yields a `string[]` full of non-strings. | Delete both and call the `lib/local-storage.ts` pair. | fix-now |
| 1.5 | `components/link/link-flow.tsx:14` | A local `const ARTISTS = ["tripleS", "ARTMS", "idntt"]` shadowing `store/artists.ts`'s `ARTISTS`. A fourth artist would be added in one place and missed in the other. | Import `ARTISTS` from the store. | fix-now |
| 1.6 | `components/profile/profile-data.ts:32`, `fixtures/users.ts:41` | The same `h * 31 + charCode` string hash written twice, next to a third (FNV-1a) in `lib/seeded.ts`. | Export it from `lib/seeded.ts` as `hash31` and call it from both. Byte-identical output, so no fixture moves. | fix-now |
| 1.7 | `routes/market.tsx:21`, `components/list/list-view.tsx:26` | `NO_PINS` — an empty `ReadonlySet` — declared twice for the same `applyFilters` argument. | Export one from `filters/filter-store.ts`, next to `applyFilters`. | fix-now |
| 1.8 | `components/objekt-card.tsx:115`, `components/shared/data-table.tsx:96`, `components/profile/progress-view.tsx:122` | Three hand-written copies of the Enter/Space handler that makes a `role="button"` div behave like a button. One of them (the card's) also carries the `e.target !== e.currentTarget` guard the other two silently lack. | One `activateOnKey` helper in `lib/a11y.ts`, with the target guard built in. | fix-now |
| 1.9 | `components/user-menu.tsx:263`, `components/profile/profile-header.tsx:158`, `components/list/list-header.tsx:119` | `toastManager.add({ title: "Copied Discord format" })` written out three times for a feature the lab does not model. | Covered by §4: route all three through `notImplemented`. | fix-now |
| 1.10 | `routes/{home,market,activity,lists}.tsx`, `components/list/list-header.tsx`, `components/profile/profile-header.tsx` | The page `h1` class string (`font-display text-[22px] font-semibold tracking-tight text-balance`) is repeated six times, and two of the six have dropped `text-balance`. | A `PageHeader` would unify it, but the six headers sit in six different row layouts; extracting one is a layout change with real visual risk in a no-visual-change round. | defer |
| | | | **Fixed (R36):** five of the six *do* share one row (`routes/{home,market,activity,lists,link}.tsx`); they are now `components/shared/page-header.tsx`. The other two (`list-header.tsx`, `profile-header.tsx`) are different shapes and stay. | |
| 1.11 | `fixtures/objekts.ts:63,96` | `toObjekt` and `ownedObjekt` spell out the same fourteen fields, because oxlint's `no-map-spread` forbids the obvious `{...collection, serial}`. | Correct as written; worth knowing before the port hits the same rule. | defer |

## 2. Dead code

| # | Where | Problem | Fix | Tag |
| --- | --- | --- | --- | --- |
| 2.1 | `components/ui/accordion.tsx`, `components/ui/autocomplete.tsx`, `components/ui/table.tsx` | Three cnippet registry copies with **zero** importers anywhere in the tree. `table.tsx` was superseded by `shared/data-table.tsx` (round 27), `autocomplete.tsx` by `combobox.tsx` (round 11), `accordion.tsx` by the hand-rolled `grid-rows-[0fr→1fr]` `Region` (round 17). 622 lines. | Delete all three. They are one `bunx shadcn add` away if a later round wants them. | fix-now |
| 2.2 | `package.json` | `virtua` is a dependency with no importer: round 8's virtualised drawer grid was dropped and never came back. | Remove the dependency. | fix-now |
| 2.3 | `components/app-nav.tsx:12` | `NAV_LINKS` is exported; only the `NavLink` *type* is imported elsewhere. | Drop `export` on the const, keep it on the type. | fix-now |
| 2.4 | `components/user-menu.tsx:70` | `SettingsDialog` is exported but only used by `UserMenu` and `SignedOutNav` in the same file. | Covered by §3: it moves to its own file and the export becomes real. | fix-now |
| 2.5 | `lib/color.ts:32,42,43` | `luminance`, `INK_DARK` and `INK_LIGHT` are exported; only `inkOn` (same file) reads them. | Drop the `export` keyword; the doc comments stay. | fix-now |
| 2.6 | `components/list/list-form.tsx:46`, `components/profile/lists-view.tsx:21`, `fixtures/serials.ts:27` | `listErrors`, `profileLists` and `MINT_OWNER` are exported but consumed only by their own file. | Drop `export`. | fix-now |
| 2.7 | `components/ui/*` generally | ~90 further exports have no caller (`DrawerMenuRadioItem`, `SelectButton`, `ComboboxChipRemove`, the whole `CardFrame*` family…). | Deliberate: these are verbatim registry copies, and trimming them makes the next `shadcn add` a merge conflict instead of an overwrite. Recorded so a future reviewer does not re-flag them. | defer |
| 2.8 | `lib/dev-overflow-guard.ts:99` | `checkOverflow` has no importer. | Deliberate and documented in the file — it is the handle for a manual run from the devtools console. Keep. | defer |
| 2.9 | ~25 sites across `src` | Comments that narrate the project's history rather than explain the code: "Round 22 made…", "the button used to flip the fake session", "the feed used to carry a pre-rendered `"3s ago"`", "round 14's phone glyph is gone". They are the most valuable thing in the file for somebody who read the findings doc and the most confusing for somebody who did not. | Rewrite each as a plain statement of what the code does and why, keeping every fact and dropping the round numbers and the before/after framing. | fix-now |

## 3. Oversized files

| # | Where | Problem | Fix | Tag |
| --- | --- | --- | --- | --- |
| 3.1 | `components/objekt-drawer.tsx` (1061) | Four unrelated panels, the API response types, the timeline model and the drawer shell in one file. | Split into `components/objekt-drawer/{index,types,serials,market,metadata}.tsx`. Import path stays `@/components/objekt-drawer` via the folder index. | fix-now |
| 3.2 | `components/account/account-dialog.tsx` (455) | Five independent sections (avatar, general, linked accounts, password, danger) plus the dialog shell. | Split into `components/account/account-dialog/{index,avatar-field,general,linked-accounts,password,danger}.tsx`. Import path unchanged. | fix-now |
| 3.3 | `components/user-menu.tsx` (415) | The Settings dialog and the artist-scope controls are half the file and have nothing to do with the avatar menu. | Move `SettingsDialog`, `ArtistsSection` and `ArtistAvatar` to `components/account/settings-dialog.tsx`. | fix-now |
| 3.4 | `components/profile/profile-data.ts` (337) | Two subjects in one module: the fake-profile generator, and the progress maths (tallies, ranks, `memberProgress`, `shapeProgress`). | Split the progress half into `components/profile/progress-data.ts`; update the four importers. | fix-now |
| 3.5 | `store/lists.ts` (336) | 120 lines of seed data in the middle of the store. | Move the seed rows and `seedEntries` to `store/lists-seed.ts`; the store imports `SEED`. | fix-now |
| 3.6 | `components/profile/progress-view.tsx` (439), `components/profile/activity-view.tsx` (308), `routes/activity.tsx` (301) | Large, but each is one subject with its own fixtures right where they are read. | No clean seam that is not arbitrary. Left alone. | defer |

## 4. Stubs — the 34 `toastManager.add` calls

Classified by whether the toast reports something that actually happened:

**(a) Real feedback for a real action — 21 calls, unchanged.** Every one of these follows a store
write or a navigation: `add-to-list-dialog`, `create/edit/delete-list-dialog`, `list-view` remove,
`edit-profile-dialog`, `edit-cosmo-dialog`, `linked-card` unlink, `link-flow` link, `user-menu`
sign out, `copy-button` ×2, `account-dialog` link/unlink/password/save, the four auth forms,
`profile-toolbar` snapshot apply, and `collection-view`'s **Pin** (round 28 made the pin store
real).

**(b) Placeholder for a feature the lab does not model — 12 calls.** Discord format ×3, Share /
link-copied ×3, Export, "Pulled your … profile", "Account deleted", "Opening Cosmo", the two
social sign-in buttons, `collection-view`'s **Lock** and **Add to list**, and `set-price-dialog`
when no `onSave` is supplied.

| # | Fix | Tag |
| --- | --- | --- |
| 4.1 | Route every (b) call through one `notImplemented(toast)` helper in `components/shared/not-implemented.ts`, so `grep notImplemented` lists the lab's whole pretend surface. The helper forwards its argument to `toastManager.add` verbatim — the toast type, title and description each site shows today are unchanged, which is the point: this makes the calls greppable, not different. | fix-now |
| 4.2 | `components/profile/collection-view.tsx:88` — `bulkToast` is used by Pin (a real store write), Lock and Add to list (neither modelled), so one helper spans both classes. | Split: Pin keeps `toastManager`, Lock / Add to list go through `notImplemented`. | fix-now |
| 4.3 | `components/profile/set-price-dialog.tsx:61` — real on a sale list (`onSave` writes prices), a placeholder on the profile Collection tab (no `onSave`). | Branch on `onSave` so only the unhandled case is tagged. | fix-now |
| 4.4 | (c) leftover toasts — none found. Every call is reachable from the UI. | — | — |

## 5. Consistency

| # | Where | Problem | Fix | Tag |
| --- | --- | --- | --- | --- |
| 5.1 | 11 sites (`system-status.tsx` ×3, `link-flow.tsx` ×4, `list-form.tsx` ×2, `account-dialog.tsx` ×2) | Two names for one token in the same class string: `text-destructive-foreground` next to `bg-danger/8`, `border-destructive/32` next to `bg-danger`. `app.css` aliases the cnippet `*-foreground` names onto the intentui `*-subtle-fg` ones, so both resolve identically — but the website uses the intentui names, and a port that copies these strings gets a token it does not have. | Use the intentui names in app code (`text-danger-subtle-fg`, `text-success-subtle-fg`, `text-warning-subtle-fg`, `border-danger/32`). The `app.css` aliases stay — the cnippet registry components in `components/ui/` need them. | fix-now |
| 5.2 | `components/profile/pin-dnd.tsx:208` | `useContext(…)` where `shared/data-table.tsx` uses React 19's `use(…)` for the same job. | Use `use`. | fix-now |
| 5.3 | `components/user-menu.tsx:90,107` | `set({ theme: v as Theme })` — a cast, where `filter-bar.tsx` types the same Base UI callback (`(v: Columns \| null) => …`) and needs no cast. | Type the callback parameter; drop both casts. | fix-now |
| 5.4 | `components/list/list-form.tsx:21` | `Object.keys(LIST_TYPE_LABEL) as ListType[]` — a cast standing in for the `as const` array the union should be derived from. | Add `LIST_TYPES` to `store/lists.ts`, derive `ListType` from it, and have the Select map it. | fix-now |
| 5.5 | Signed-in user | Three stores answer "who is signed in": `store/session.ts` (is there a session), `store/account.ts` (the site account row), `store/link.ts` (which Cosmos it owns). | Correct — they mirror three separate tables in the app (`session`, `user`, `cosmo_link`), and the surfaces that need all three read all three. No change. | defer |
| 5.6 | "The current profile" | `useScopedProfile(nickname)` is the single entry point and every surface goes through it. | Already one way. ✔ | — |
| 5.7 | `lib/seeded.ts` | After §1.6 the module holds two hashes (FNV-1a for the deterministic fixtures, `*31` for the profile/address seeds). | Intentional: swapping either one reshuffles fixtures that screenshots in `design/` already record. Documented in the file. | defer |
| 5.8 | File naming, export style, `import * as z`, no `.js` extensions, no `enum`/`class`, `no-map-spread` | All 141 files are kebab-case; every component is a named `export function`; zod is imported as a namespace everywhere; oxlint reports no `no-map-spread` violations. | ✔ nothing to do | — |
| 5.9 | Tailwind arbitrary values | ~40 arbitrary values remain, almost all container-query units (`size-[15cqi]`, `text-[7cqw]`) or type sizes with no theme step (`text-[13px]`, `text-[12.5px]`). The `rounded-[2px]`/`[3px]`/`[4px]` trio has no exact theme equivalent — `rounded-sm` is `calc(var(--radius) * 0.6)` = 4.8 px. | Changing any of them moves pixels. Left as is; spacing utilities already use the theme scale throughout. | defer |

## 6. Type hygiene

| # | Where | Problem | Fix | Tag |
| --- | --- | --- | --- | --- |
| 6.1 | whole tree | Zero `any`, zero non-null assertions (`!.`), and the only casts outside `components/ui/` are the four in §5.3/§5.4 plus three unavoidable `as CSSProperties` for custom-property styles and one `as LabCollection[]` on the JSON import. | Clean after §5.3/§5.4. | — |
| 6.2 | `components/filters/member-chips.tsx:25` | `artist[0] as LabArtist` — `Filters.artist` is `string[]`, so the element is widened. | Narrowing `Filters.artist` to `LabArtist[]` would ripple through `FacetValues`, which is deliberately `Record<FacetKey, string[]>` so one table drives five facets of different value types. Cast is the cheaper truth. | defer |
| 6.3 | `hooks/use-api.ts:36` | `(await response.json()) as T` — the one unavoidable cast: `json()` returns `any` and the lab does no runtime validation. | Correct for a fixture-backed prototype. The website validates through oRPC/zod, so the port does not inherit this. | defer |

## 7. React

| # | Where | Problem | Fix | Tag |
| --- | --- | --- | --- | --- |
| 7.1 | `hooks/use-api.ts:26` | `react(set-state-in-effect)` warning. The effect resets state synchronously when `url` changes, so the previous url's data paints for one frame before the reset lands. | Fixable locally: hold the url alongside the data and reset **during render** when it differs (React's own "adjusting state when props change" pattern), leaving the effect with only the async `.then`/`.catch` writes. Strictly better behaviour — one fewer paint — with the same observable states. | fix-now |
| 7.2 | `components/profile/profile-banner.tsx:19` | The second `react(set-state-in-effect)` warning. `useBannerMedia` holds the still frame in state and re-sets it from an effect on every `kind` / `seed` change. | Also local: the still frame is a pure function of `(kind, seed)` over a module-level cache, so derive it with `useMemo`; keep state only for the async video, tagged with the seed it was recorded for. Same render sequence (still frame, then video when ready). | fix-now |
| 7.3 | 9 components | `useFilters()` with no selector returns the whole state object, so any filter change gives every consumer a new identity. Round 27 already paid for this once: it remounted the Event `Select` mid-interaction. Same shape for `useSelection()`, `useArtists()`, `useSettings()`. | Correct for the lab (one store, ≤180 rows, no server state) and wrong for the website, which pairs the same store with React Query and much larger grids. Changing it here is a behaviour risk for no gain — but it is the single most important thing the port must **not** copy. | defer |
| 7.4 | `components/filters/filter-bar.tsx:96,144` | Two effects depending on the whole `f` object, so they re-run on every filter change and are guarded by a condition inside. | Same root cause as §7.3; the guards are correct. | defer |
| 7.5 | `routes/profile.tsx` | `useScopedProfile(nickname)` is called five times per render (the layout plus each tab component). | Each call is `useMemo`'d and the work is a filter over ≤180 rows. Passing the profile through the router context would be the tidy fix and is a behaviour-visible change to the route tree. | defer |
| 7.6 | whole tree | Missing `key`s: none. Unstable inline objects passed to memoised children: none (nothing is `memo`'d). `useMemo` around trivial work: none. | ✔ | — |

## 8. Accessibility

| # | Where | Problem | Fix | Tag |
| --- | --- | --- | --- | --- |
| 8.1 | `components/filters/active-chips.tsx:37` | A member chip's accessible name is the bare member name ("Choerry, button") — nothing says the button removes the filter. The non-member chips read a little better ("Season: Atom02") but still do not say what activating does. | `aria-label={`Remove ${c.label}`}` on the chip button. No visual change. | fix-now |
| 8.2 | whole tree | Every icon-only `Button size="icon*"` and every `MenuTrigger` / `TabsTab` / bare `<button>` carrying only a glyph has an `aria-label` (12 sites checked individually). | ✔ | — |
| 8.3 | Interactive `div`s | Three (`ObjektCard` body, `DataTableRow`, `MissingCard`) — all carry `role="button"`, `tabIndex={0}` and an Enter/Space handler. §1.8 unifies the handler. | ✔ | — |
| 8.4 | Dialogs | All 14 dialog/alert-dialog/sheet/drawer popups have a title (`NavSearch` and `FilterSheet` use `sr-only` ones) and a description or a deliberate `sr-only` stand-in. | ✔ | — |
| 8.5 | Focus return | Base UI returns focus to the trigger on close for Dialog, AlertDialog, Sheet, Drawer, Menu and Popover; re-checked in the smoke pass. | ✔ | — |
| 8.6 | `components/profile/progress-view.tsx:48` `Meter` | A visual bar with no `role="progressbar"` / `aria-valuenow`. | The adjacent `Value` renders `owned/total (pct%)` as real text inside the same row, so the number is already announced; adding a progressbar role would announce it twice. Left as is, recorded. | defer |
| 8.7 | `routes/lists.tsx:96` | The three stacked thumbnails on a list card are `ObjektCard`s with real `alt` text, so a card announces three objekt names before its own actions. | Wants an `alt=""` / decorative switch on `ObjektCard`, which is a new prop and a behaviour decision. | defer |

## 9. Dev-only guards

| # | Finding | Tag |
| --- | --- | --- |
| 9.1 | **Both guards are tree-shaken from the production build.** `bun run build --filter=lab`, then grep of `dist/assets/*.js`: `"[overflow]"` 0 hits, `"scrolls horizontally"` 0 hits, the `POPUP_SELECTOR` string 0 hits, `"Render both surfaces from FACETS"` 0 hits. The only survivor is the inert `data-overflow-guard` attribute on `<main>`, which is plain JSX and not behind `import.meta.env.DEV` — 22 bytes, no code attached. | ✔ verified |

## 10. Console

| # | Where | Problem | Fix | Tag |
| --- | --- | --- | --- | --- |
| 10.1 | `index.html` | No `<link rel="icon">`, so every page logs a `/favicon.ico` 404 — the lab's only console line (recorded in round 27 as pre-existing). | Add `apps/lab/public/favicon.svg` (the nav's cube mark, theme-aware via `prefers-color-scheme`) and link it. | fix-now |

---

## What the website port should watch for

1. **Token names (§5.1) — superseded by round 30.** The lab no longer keeps two
   vocabularies: `styles/app.css` defines the cnippet set and nothing else, and
   every app-code class string was swept onto those names. **The website should
   rename its own tokens during the port, not alias them.** An alias keeps both
   spellings valid, and both spellings is what produced the eleven mixed class
   strings this round had to unpick.

   The trap the aliases were hiding is still the thing to get right: cnippet's
   `*-foreground` on a feedback colour means *text on an 8–16 % tinted chip*,
   which is intentui's `*-subtle-fg`, **not** `*-fg` (text on a solid fill).
   Text on a solid fill is `text-white`, the way cnippet's own `Button` and
   `Badge` destructive variants write it, and there is no `*-subtle` background
   token at all — a tint is `bg-destructive/8`.

   | intentui (website today) | cnippet (canonical) | note |
   | --- | --- | --- |
   | `--bg` | `--background` | |
   | `--fg` | `--foreground` | |
   | `--card-fg` | `--card-foreground` | |
   | `--overlay` | `--popover` | not `--card`: `--card` is `transparent` in the lab's dark theme |
   | `--overlay-fg` | `--popover-foreground` | |
   | `--primary-fg` | `--primary-foreground` | |
   | `--secondary-fg` | `--secondary-foreground` | |
   | `--accent-fg` | `--accent-foreground` | |
   | `--muted-fg` | `--muted-foreground` | |
   | `--danger` | `--destructive` | |
   | `--danger-subtle-fg` | `--destructive-foreground` | the round-6 trap |
   | `--success-subtle-fg` | `--success-foreground` | |
   | `--warning-subtle-fg` | `--warning-foreground` | |
   | `--info-subtle-fg` | `--info-foreground` | |
   | `--sidebar-fg` | `--sidebar-foreground` | and the rest of the `sidebar-*-fg` trio |
   | `--danger-fg` / `--success-fg` / `--warning-fg` / `--info-fg` | *(none)* | solid-fill ink is `text-white` |
   | `--*-subtle` | *(none)* | tints are opacity modifiers on the fill |
   | `--primary-subtle*`, `--accent-subtle*`, `--navbar*` | *(none)* | unused; dropped |

   The proof that a rename moves nothing: dump `getComputedStyle` for every
   element on every route in both themes before and after, and diff. The lab's
   run covered 12 routes × 2 themes (14 738 elements per theme, 12 colour
   properties each — 29 476 snapshots in all) and came back byte-identical. Mask the system-status
   trigger first — its tint comes from a clock-driven fixture that rolls every
   minute, and it is the one thing in the page that is not deterministic.
2. **Whole-state store reads (§7.3).** The lab gets away with `useFilters()` because it has one store and 180 fixture rows. The website pairs the same store with React Query and grids an order of magnitude larger; copy the *selector* style (`useFilters((s) => s.member)`), not the lab's call sites. Round 27's remounting `Select` is what this costs when it goes wrong.
3. **`useApi` has no analogue (§7.1).** It is a fixture-era stand-in for React Query. Port the *shape* of the drawer's four branches (`pending → hide → !owner → found`) and drop the hook.
4. **The dev guards are lab-only tooling (§9.1).** `dev-overflow-guard.ts` and `useFacetParity` are worth porting, but they depend on `data-overflow-guard` on `<main>`, on `data-scroll-x` being declared on every deliberate scroller, and on the round-9 `overflow-x-clip` wrapper. All three have to land together or the guard is either silent or all noise.
5. **`ObjektCard`'s keyboard contract (§1.8).** The card body ignores keys whose `target` is not itself, so nested controls never have to `stopPropagation` — which matters because stopping a React synthetic event also stops the native one, and dnd-kit's keyboard drag listens on `document`. Port the guard, not the per-child `stopPropagation` the website's card uses today.
6. **`is_profile_bind` vs `profile_address` (§ rounds 21/27).** Unchanged by this round and still the thing most likely to be got wrong: ownership keys off the address, display keys off the flag. `apps/website`'s `list-header.tsx` and `my-list.tsx` currently gate their link glyph on the *display* half.
7. **Registry files are vendored, not owned (§2.7).** `components/ui/*` carries ~90 exports with no caller on purpose. Keep them verbatim in the website too, or the next registry update becomes a merge instead of an overwrite — and keep every local fix (the round-11 `SelectGroupLabel` `cn()`, the round-14 `min-w-36` removal, the round-15 `padding` prop) in one commented block so it survives that overwrite.

---

## Outcome

**33 fixed, 12 deferred.** Checks after the round: lint **0 warnings, 0 errors** (both
react-compiler warnings gone), typecheck pass, build pass, `bunx oxfmt apps/lab` clean.

| § | Item | Outcome |
| --- | --- | --- |
| 1.1 | Search field duplicated | fixed — `components/filters/filter-search.tsx` |
| 1.2 | `NO_EXTRAS` ×2 | fixed — exported from `facet-controls.tsx` |
| 1.3 | `EVENT_COLOR` ×2 | fixed — one map in `lib/objekt.ts`, keyed on a shared `EventKind`; Activity maps its Title-Case label through a typed `EVENT_KIND` record rather than a cast |
| 1.4 | `nav-search` private storage helpers | fixed — now `readStringArray` / `writeStringArray` |
| 1.5 | `ARTISTS` shadowed in `link-flow` | fixed — imports the store's |
| 1.6 | `*31` hash ×2 | fixed — `hash31` in `lib/seeded.ts`; output byte-identical, no fixture moved |
| 1.7 | `NO_PINS` ×2 | fixed — exported from `filter-store.ts` |
| 1.8 | Enter/Space handler ×3 | fixed — `lib/a11y.ts` `activateOnKey`, target guard included at all three sites |
| 1.9 | Discord-format toast ×3 | fixed with §4.1 |
| 1.10 | Page `h1` class ×6 | fixed (R36) — `shared/page-header.tsx` over the five routes that share the row; Home before/after byte-identical |
| 1.11 | `toObjekt` / `ownedObjekt` field lists | deferred |
| 2.1 | 3 orphan registry files | fixed — `ui/{accordion,autocomplete,table}.tsx` deleted (622 lines) |
| 2.2 | `virtua` dependency | fixed — removed, `bun install` re-run |
| 2.3–2.6 | 8 unused exports | fixed — `export` dropped on `NAV_LINKS`, `luminance`, `INK_DARK`, `INK_LIGHT`, `listErrors`, `profileLists`, `MINT_OWNER`; `SettingsDialog`'s export became real when it moved (§3.3) |
| 2.7, 2.8 | Registry surface, `checkOverflow` | deferred (deliberate) |
| 2.9 | Round-N narration | fixed — 22 comments rewritten as plain explanations; `grep -i "round [0-9]"` over `src` (excluding `ui/`) now returns nothing |
| 3.1 | `objekt-drawer.tsx` 1061 | fixed — `objekt-drawer/{index 241, serials 422, market 202, metadata 106, types 101}`; importers unchanged |
| 3.2 | `account-dialog.tsx` 455 | fixed — `account-dialog/{index 114, general 132, linked-accounts 106, password 78, danger 52}`; importers unchanged |
| 3.3 | `user-menu.tsx` 415 | fixed — 216 lines; `SettingsDialog` / `ArtistsSection` / `ArtistAvatar` / `ArtistsSubmenu` → `components/account/settings-dialog.tsx` (206) |
| 3.4 | `profile-data.ts` 337 | fixed — 121 lines + `progress-data.ts` (224); three importers repointed |
| 3.5 | `store/lists.ts` 336 | fixed — 193 lines + `store/lists-seed.ts` (157) |
| 3.6 | progress/activity views | deferred |
| 4.1 | 12 placeholder toasts | fixed — `components/shared/not-implemented.ts`; `toastManager.add` in app code now means the store really changed |
| 4.2 | `bulkToast` spanning both classes | fixed — `bulkDone` (Pin) / `bulkStub` (Lock, Add to list) |
| 4.3 | `SetPriceDialog` | fixed — branches on `onSave` |
| 5.1 | Mixed token names ×11 | fixed — intentui names in app code. Verified in the page that each old and new class computes the **same** colour (`danger` `oklch(0.712 0.194 13.428)`, `success` `oklch(0.897 0.196 126.665)`, `warning` `oklch(0.905 0.182 98.111)`) |
| 5.2 | `useContext` vs `use` | fixed |
| 5.3 | `as Theme` / `as Language` | fixed — typed callbacks |
| 5.4 | `Object.keys(...) as ListType[]` | fixed — `LIST_TYPES` in `store/lists.ts`; `ListType` derives from it, and the two `as ListType` casts in the form went with it |
| 5.5–5.9 | Store split, seeded hashes, naming, arbitrary values | deferred (each correct as it stands) |
| 6.1 | Casts | fixed via §5.3 / §5.4 |
| 6.2, 6.3 | `artist[0] as LabArtist`, `json() as T` | deferred |
| 7.1 | `useApi` set-state-in-effect | fixed — state carries its url and resets during render; the effect only writes from the async callbacks |
| 7.2 | `useBannerMedia` set-state-in-effect | fixed — the still frame is `useMemo`'d over the module cache, and only the video is state, tagged with the seed it was recorded for |
| 7.3–7.6 | Whole-state selectors, repeated `useScopedProfile` | deferred |
| 8.1 | Chip has no removal affordance | fixed — `aria-label={`Remove ${label}`}`, verified in the page |
| 8.2–8.5 | Icon labels, interactive divs, dialog titles, focus return | already correct |
| 8.6, 8.7 | `Meter` role, list-card thumbnails | deferred |
| 9.1 | Dev guards in the bundle | verified again after the round: 0 hits for the guard strings in `dist/assets/*.js` |
| 10.1 | favicon 404 | fixed — `apps/lab/public/favicon.svg` + `<link rel="icon">`; `/favicon.svg` answers 200 |

### Smoke pass

Driven with `browser-use` against the running dev server on port 3100, at **1440×900** and at
**390×844 (mobile, touch)**.

- Pages walked at both widths: Home, Market, Activity, Lists, list detail, `/link`, `/login`,
  `/terms-privacy`, and all five profile tabs (Collection, Activity, Progress, Statistics, Lists).
- At 390 every page measures `scrollWidth === clientWidth === 390`; at 1440 the document never
  scrolls sideways.
- Interactions: objekt drawer opened from a card, all three tabs switched and switched back
  (Serials → Market → Metadata → Serials); the avatar menu (Artists, My lists, My Cosmo, Account,
  Settings, Sign out); the mobile nav sheet (all four links); the mobile Filters sheet (all five
  facets plus Columns); a member chip added, its `aria-label` read back as `Remove Member: Choerry`,
  then cleared with Clear all.
- **Console clean on every page** — the dev overflow guard stayed silent, the facet-parity guard
  stayed silent, and the favicon 404 is gone. Screenshot: `design/lab-review-smoke.png`.

One wrinkle worth recording for whoever refactors next: **the Vite dev server caches path
resolution, so deleting a file and replacing it with a directory of the same name leaves stale
importers.** After `objekt-drawer.tsx` became `objekt-drawer/`, modules Vite had not re-transformed
still resolved `@/components/objekt-drawer` to the deleted file and the page rendered blank with no
console error — `import()` failed with `Failed to fetch dynamically imported module` naming the
*entry*, while the culprit was a transitive request answered with `text/html`. Touching every
importer forces the re-transform and clears it without restarting the server. The production build
was never affected.
