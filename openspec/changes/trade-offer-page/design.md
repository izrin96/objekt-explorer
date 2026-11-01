## Context

- **The builder today.** `OfferBuilder` (`features/offers/offer-builder.tsx`) is a `Dialog`. It renders `MatchesBuilder` for a request with `matches`, or `BuilderHeader` and `BuilderForm` without. It is opened through `useOfferBuilder().open(request)`, or through `OfferBuilderProvider`'s shared opener above a virtualised feed.
- **The request.** `OfferRequest` (`builder/types.ts`) holds `to` (a list target or a conversation id), `name`, `counter`, `prefill` (picks, top-up, note, collections), `startList`, `matches` (`partnerId`, `list`, `mutual`, `post`) and `addNear`.
- **Who builds a request.**

  | Source | Where | What the request holds |
  | --- | --- | --- |
  | Trade row | `TradeActions` → `MakeOfferButton` | The row's matches |
  | Per-post menu, near drawer | `PostBlock`'s `makeOffer` | One post's matches, and the near pick |
  | Chat | `thread.tsx` | `{ conversationId }` plus `postOfferOf` (the newest post card's matches) |
  | Counter | `counterRequest(offer, …)` | A prefill copied from an `OfferView` |
  | Trade page status card | `next-step-banner.tsx` | A bare conversation request |
  | Market tab | `offerRequest(item, slug)` (`market-listing.ts`) | A one-pick prefill and `startList` |

- **Sending.** `BuilderForm` sends with `offer.create`. A request that is not addressed to a conversation then navigates to `/messages/$id`.
- **Pickers.** `OfferPicker` is a second `Dialog` holding `PickerBody`.
- **The prototype.** The throwaway route `/trade/offer-prototype` on branch `proto/offer-page` showed the existing form inside a page. It mounts a `Dialog` root with no popup, so the dialog parts render in place. The user chose variant A: a column, the matches line above both sides, and the picker as a wide sheet.
- **The handle** and its resolver `trade.person` come from `trade-person-and-post-pages`.

## Goals / Non-Goals

**Goals:**
- One builder, the page, with the dialog code deleted rather than kept beside it.
- The same start (address, prefill, matches, near pick, counter) from every source, rebuilt from the URL.
- No change to the form's rules: matches, the near line, the top-up, the send checks and refusals.

**Non-Goals:** see the proposal. In addition: no draft store, and no server change.

## Decisions

**1. The URL is a start recipe, built by one pure module.**
- `features/offers/offer-link.ts` holds `offerSearchSchema` and two functions:
  - `offerLink(start)`, which every caller uses to build `{ to, params, search }`;
  - `requestOf(search, partner)`, which the page uses to rebuild an `OfferRequest`.
- The search keys:
  - `to` (a list slug) or `conversation` (an id): the address;
  - `match` (`row`, or `post` with `post=<slug>`), plus `list` and `mutual`: the matches;
  - `near` (a collection slug): the near pick;
  - `counter` (an offer id);
  - `start` (their list slug): the List choice You get's picker opens on;
  - `ask` (a collection slug, with an optional `objekt` and `serial`): a Market listing's objekt, which is public data the server checks again on send;
  - `from` (a same-origin path starting with `/`): where Back and Cancel return to.
- Tests cover the round trip from every source above, and the rejection of an outside `from`.
- *Alternative:* hand the request over in memory (Zustand) and keep only a key in the URL. Rejected: a reload or a shared link would open an empty page, and the start points are cheap to rebuild.

**2. Route `routes/(container)/trade/@{$handle}/offer.tsx`.**
- It sits under the handle layout from `trade-person-and-post-pages`, which resolves the handle and redirects to the canonical one. That layout must keep the search on that redirect.
- A static `offer` segment wins over `$slug` in TanStack's ranking. List slugs are 9 generated characters, so none is "offer".
- `beforeLoad` sends a signed-out visitor to `/login?redirect=…`.
- `validateSearch` is `offerSearchSchema`.
- The loader fetches:
  - for `counter`, `offer.views({ ids: [counter] })`, whose `collections` give `counterRequest` its art; an offer the viewer isn't a party to, or one that is no longer open, gives the can't-counter state;
  - for `conversation`, the thread's first page (`chat.thread`, usually already cached by the thread the sender came from), to check that the conversation is the viewer's and with this partner.
- The partner's name is the handle's display name, as on the person page.
- `staticData: { tradeChrome: false }`.

**3. The page renders the existing form, laid out by props, not a context.**
- `BuilderForm` keeps its state and logic. It returns its pieces through a small `layout` render prop, or a `BuilderLayout` component it renders with named slots: `sides`, `topup`, `note`, `sendingAs`, `error`, `send`, `hint` and `picker`. The page arranges them as variant A.
- `MatchesBuilder` draws its status region as a sibling of the body, so the one region for the matches line from `apps/web/AGENTS.md` stays one node, now placed above the sides. Each side keeps its own `role="status"` banner for picks that can't be offered.
- The dialog-only parts go: `DialogPanel`, `DialogFooter` and `DialogClose`. `BuilderHeader` drops `DialogTitle` for an `h1` that takes focus on mount.
- `OfferBuilder`, `useOfferBuilder`, `OfferBuilderProvider` and `useSharedOfferBuilder` are deleted.
- *Alternative:* the prototype's `Dialog` root with no popup. Rejected: it keeps dialog semantics on a page, and focus and Escape handling would be wrong.

**4. The picker is a `Sheet`.**
- `OfferPicker` renders `PickerBody` in `SheetPopup side="right"`. From `lg` up it is as wide as the main area (`calc(100vw - column - gutters)`, capped at `80rem`). Below `lg` it is full screen.
- `PickerBody`'s header and footer become `SheetHeader`, `SheetTitle` and `SheetFooter`. Its Cancel and Done stay.

**5. Leaving asks through the router.**
- `useBlocker({ shouldBlockFn })` reads the same `holdsDraft` the dialog's close used (`builder/draft.ts`), with `enableBeforeUnload` for a reload or a closed tab. The existing discard `AlertDialog` is the prompt.
- Send's own navigation and Remove matches with nothing left skip it.
- Back and Cancel step back through history when the page was opened in the app (`offerBack` in the history state, kept across the handle redirect), so a feed comes back scrolled; else they replace the page with `from`, else the person page. The control that opened the page (a Make offer link, or chat's Add to message) takes focus again, through a one-shot in-memory opener (`features/offers/return-focus.ts`). After a successful send, `offer.create`'s `onSuccess` navigates to `/messages/$id` for every source, with `replace` so Back doesn't return to a sent draft.

**6. Callers link.**
- `MakeOfferButton` becomes a `Link` built by `offerLink`.
- The per-post menu, Make offer with it in the near drawer, chat's Add to message and deal strip, Counter, the status card and the Market row navigate to the page.
- `from` is the current location, built from `useLocation().href`.
- The handle each one passes:
  - a Trade row: `person.handle`;
  - chat, Counter and the trade page: the post card's `owner.handle`, else the partner's `identity.nickname` or `identity.address` (`chatPartnerSchema`, which the trade view's partner extends), which redirect;
  - Market: the listing's profile nickname or address, which redirects.
- Chat restores focus to Add to message on return through the same one-shot opener (`chat-add:<id>`), which the thread reads once on mount; the thread's URL, with the inbox's `q`, `box` and `show`, is left as it was.

**7. Layout values.**
- From `lg`, `grid-cols-[20rem_minmax(0,1fr)]`: the title in column 1 above the details (top-up, note, Sending as, hint, Cancel and Send), which are `sticky top-20`; the status line, then `md:grid-cols-2` sides, in column 2. The title scrolls away. Keeping it in the sticky part would put the details before the sides in the DOM, so a phone's tab order (title, status line, sides, details) would no longer follow what it shows; and the status line must sit outside the part that changes from placeholders to the form, so it is never replaced.
- Below `lg`, one column in that order, the details wrapper `display: contents`, so the bar holding the hint, Cancel and Send is a child of the page's column and `sticky bottom-0` across it, as on `/trade/new`.
- The sides drop their inner `max-h` and scroll with the page.

## Risks / Trade-offs

- [Make offer leaves chat] → Back and Cancel return to the thread with focus restored, and sending lands there too. The thread keeps its scroll through the router's scroll restoration.
- [Rebuilding from the URL re-reads the matches] → It costs the same as opening the dialog did. A reload also drops the sender's own edits, behind the prompt.
- [The matches can change between the click and the page] → As with the dialog, the read happens when the page opens, and the line reports what was added.
- [`ask` carries public listing data] → `offer.create` already checks every pick against current ownership and list membership, as for the dialog's prefill.
- [Make offer leaves a virtualised feed] → Back to `from` must land on the same row of Browse or For you. The router's scroll restoration plus the stored people order (an hour) should hold it. The browser check confirms it, and if it fails, the feed keeps its scroll offset per `from` as Back's state.
- [Back from a Market listing] → The objekt drawer is not in the URL, so Back lands on the page the drawer was opened over, with the drawer closed. That is accepted; `from` names that page.
- [An open tab from before the deploy] → Its bundle still opens the dialog until it reloads. Nothing on the server changes.

## Migration Plan

Web only. It deploys after `trade-person-and-post-pages`, whose handle routes it needs. Rollback reverts the web: the dialog comes back, and nothing else depends on the page.
