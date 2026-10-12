# web

TanStack Start app on Base UI (the cnippet registry). `src/components/ui/*` are vendored registry copies kept verbatim; `src/components/ui/README.md` lists the only local edits.

## Rules

- **State.** URL state is the route's `validateSearch` with Zod. Zustand reads are selectors (`useFilters((s) => s.member)`), never the whole store.
- **Data.** Server data goes through React Query with the `@orpc/tanstack-query` utils. Route loaders load the first paint with `queryClient.query({ ...options, staleTime: "static" })`. `useSuspenseQueries` has no `enabled: false` (it suspends forever), so fetch unconditionally and ignore the result when it does not apply.
- **Strings.** Every user-facing string is `m.*` from Paraglide. A dialog's dismiss button is `m.common_modal_cancel()` when the dialog has a primary action that commits something, and `m.common_modal_close()` when it is informational or only produces output to copy.
- **UI kit.** Phosphor icons; `virtua` for grids.
- **Tokens.** cnippet token names only. `text-*-foreground` on a feedback colour is text on a tinted chip, not on a solid fill: text on a solid fill is `text-white`, and a tint is an opacity modifier on the fill (`bg-destructive/8`), since there is no `*-subtle` token.
- **Lists.** Where a list lives and who owns it key off its profile **address**; `isProfileBind` only decides whether it shows on that profile (`features/list/list-link.ts`).
- **Overflow guard.** `lib/dev-overflow-guard.ts` reports horizontal overflow in dev. Declare every deliberate horizontal scroller with `data-scroll-x`, or the guard reports it.

## Verifying against production

The dev server talks to production unless `.env.local` overrides it, and the account in `SMOKE_TEST1_*` is the user's own: sign in and read, never write. A `window.fetch` shim cannot hold a write back, because `lib/orpc.ts` captures `fetch` when it builds its `RPCLink`. Verify a mutation up to the request boundary (its input and the request it would send) and leave the control unclicked.

## Pin drag-and-drop

`features/profile/pin-dnd.tsx` and `use-pin-order.ts`. The drop commits through plain React state (`pinOrderOverride`) set in the same handler as dnd-kit's cleanup, so both land in one commit; the mutation's `onSettled` clears it. React Query defers cache notifications to a later task, so `setQueryData` cannot paint in that frame, and `flushSync` commits while dnd-kit is still active. Reordering the DOM during `onDragOver` remounts `virtua` cells and kills the shift animation, hence `animateLayoutChanges: () => false`.
