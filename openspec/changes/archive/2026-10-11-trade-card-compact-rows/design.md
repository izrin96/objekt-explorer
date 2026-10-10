## Context

See proposal.md for why. Current state in `apps/web/src/features/trade/`:
- `trade-card.tsx`: `TradeCard`, a boxed `article` with avatar, name, socials, `TrustLine`, a meta slot, Message / Make offer at the top right, a `SafetyMenu` (⋯ with Block, Report and extra items), then `match` and `children`.
- `match-line.tsx`: `MatchLine` derives mutual, renders the coloured counts and wraps them in the matched-lists popover. `MATCH_TONE` is reused for section headings.
- `partner-card.tsx`: meta (list badges and links, idle, also-known-as), Hide in ⋯, two stacked sections using `MatchGrid` / `MatchObjekt` (`THUMB_GRID`, 3.5–5.5rem auto-fill), and the "Not counted" collapsible over `partner.dropped` (`{ direction, slug, reason }`).
- `browse-post.tsx` and `post-side.tsx`: a post is a `TradeCard` with a tag and a time in meta, and one section per side with list badge, name, description and `THUMB_GRID` thumbnails (ringed, sale prices).
- `browse-view.tsx`: a `WindowVirtualizer` over posts, one per item, `ssrCount` for SSR.
- `for-you-results.tsx`: a plain list of `PartnerCard`, which scrolls to and highlights a `partner=` target through `data-highlight`.

## Goals / Non-Goals

**Goals:** shared header, chip and actions components so the two tabs can't drift; no API change; Browse keeps SSR and virtualization.

**Non-Goals:** no change to `TrustLine`, `SafetyMenu`, `MessageButton`, `MakeOfferButton` internals or the offer builder prefill.

## Decisions

1. **Split `TradeCard` into parts.** `TradeCard` currently forces one layout, and the spec now asks for shared parts.
   - `trade-header.tsx`: `TradeHeader({ person, end, menuItems })` renders avatar, name, socials, `TrustLine` and `SafetyMenu`. `end` is a slot for tags (Browse) or chip + lists + chevron (For you).
   - `trade-actions.tsx`: `TradeActions({ contact, name, compact })` renders Message and Make offer, or "Not taking messages". `compact` makes Message icon-only for Browse, and Make offer gets `variant="default"`. Check that `MessageButton` and `MakeOfferButton` accept `variant` / `size` / icon-only. If they don't, add the prop there (both are local, non-vendored components).
   - `match-chip.tsx`: `MatchChip({ theyHave, youHave, popover })` replaces `MatchLine`. It's a `PopoverTrigger` button styled `toneChip("progress")` when mutual > 0, else `bg-secondary text-muted-foreground`. Text is `font-mono text-xs h-6 px-2 rounded-md`. Visible text is `aria-hidden`, and an `sr-only` span carries the three existing count messages. Mutual stays derived here, so the tabs can't disagree. `MATCH_TONE` moves here for the headings.
   *Alternative:* keep `TradeCard` with more slots and flags. That grows boolean props for two layouts (see `vercel-composition-patterns`).
2. **Compact thumbnails reuse `ObjektCard`.** `MatchObjekt` gains a `compact` form: a `w-12` (3rem) wrapper around `ObjektCard image="thumbnail" hideLabel`, then a `font-mono text-xs line-clamp-2 break-words` caption under it. The wrapper is `@container`, so `SlugTile`'s radius still matches. The item is `w-16` so two-line captions fit. Columns use `flex flex-wrap gap-2` instead of `THUMB_GRID`. The not-counted form adds `grayscale opacity-60` on the image only (the caption stays full contrast, in `text-destructive`), plus a diagonal strike drawn as an `aria-hidden` absolutely positioned bar. The reason text carries the meaning.
3. **No source list under each objekt.** Which of the user's lists matched stays in the chip's "Matched with your lists" popover. A "from <list>" caption was tried and dropped: at 3rem it was mostly clipped and doubled every caption's height.
4. **Collapse state lives in `for-you-results.tsx`.** A `Set<string>` of toggled partner ids is held in `useState`. A row is open when `!idle !== toggled.has(id)`, so the default is derived, not stored. The `partner=` target is added to the open set during render when it's a closed idle row, via a keyed initial state, so it doesn't write state in an effect (`react/set-state-in-effect` is an error). `PartnerRow` uses the vendored `Collapsible` with `open` / `onOpenChange`. The panel holds body and footer, and the header stays outside it.
5. **Browse grid: pairs per virtual item.** `browse-view.tsx` chunks `posts` into pairs (`[a, b?]`) and gives each pair to `WindowVirtualizer`. A pair renders `grid gap-4 lg:grid-cols-2 items-stretch`. Below `lg` the two posts stack inside one virtual item, so no JS breakpoint is needed, and server and client render the same markup with no hydration mismatch. `ssrCount` becomes `Math.ceil(SSR_POSTS / 2)`. `BrowsePostSkeleton` is shown in pairs the same way.
   *Alternative:* a `useMediaQuery` column count keyed into the virtualizer, as `objekt-virtual-grid` does. On the server it renders one column and reflows on hydration at desktop width.
6. **Strip, not section.** `post-side.tsx` becomes `PostStrip`: `grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-2`. The label is `ListRoleBadge`'s tone on a monospace uppercase word (`HAVE`, `SALE`, `WANT`). The row is `flex flex-wrap gap-1.5` with at most `STRIP_LIMIT = 10` items (of the 11 the server sends, so ten and the "+N" tile fill one line of a half-width card), each `w-10`, with an optional price caption, then a "+N" `TILE`. The list name and description move up to the post, under the header, because a post's sides share one name in the WTT pair case (the post's anchor list). The ring classes stay.
7. **Hide moves to the footer.** `PartnerRow` passes no extra items to `SafetyMenu`, and renders `Button variant="ghost" size="sm"` "Hide partner" before `TradeActions`. Its handler is unchanged (`onHide`).

## Risks / Trade-offs

- [Two-line captions at 3rem make columns ragged] → items have a fixed `w-16` and captions clamp at two lines, so rows stay aligned. Check with long Korean and Japanese collection names.
- [Pair virtual items are taller and variable] → virtua measures each item. The trade-off is acceptable for a feed with a page size in the tens.
- [The chip is denser than the old line for screen readers] → the `sr-only` text keeps the full sentences. Check with VoiceOver in task 5.
- [Removing Hide from ⋯ breaks muscle memory] → it's a visible footer button now, so it's easier to find.

## Migration Plan

Front-end only. Deploy and roll back with the web app.
