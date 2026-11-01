## Context

The composer today is `PostComposer` in `features/trade/post-list-dialog.tsx` (300 lines): a two-step `Dialog`, opened through `useComposer().openWith(start: ComposerStart)` from `browse-view.tsx` (New post, Your posts' Edit post), `list-view.tsx` (the Trade line), `create-list-dialog.tsx` ("List created → Post it"), `edit-list-dialog.tsx`, and the near-match fix (`near-fix.ts`). It builds a `Choice`, checks it with `planPost` over `usePlanLists()`, and sends one `trade.savePost`. Its sections are `ListSection` radio groups in `composer-lists.tsx`, and its pure helpers are `composer-choice.ts` and `post-kind-text.ts`, which already have tests.

The rule form is `RuleForm` inside `RuleDialog` (`features/list/rules/rule-dialog.tsx`). It reads `useCosmoArtist()` (provided at the root) and writes through `list.addRule` at once.

A prototype on the throwaway branch `proto/trade-post-page` (route `/trade/new-prototype`, variants A–D, deleted afterwards) compared the dialog, a one-column page, a two-column page, and D. The user chose D, a narrow settings column with a big preview, with Add rule in a side sheet and ratios on the preview.

## Goals / Non-Goals

**Goals:**

- One composer page for New post and Edit post, with the same `planPost` rules and the same `trade.savePost` call.
- Rules, New want list and ratios on the post itself, without stacked dialogs.

**Non-Goals:** see proposal. In particular, no person or post pages, and no server change beyond `trade-ratio`.

## Decisions

**1. Route: `routes/(container)/trade/new.tsx`.**
- `staticData: { tradeChrome: false }`, with its own breadcrumb (Trade / New post or Edit post).
- `validateSearch` carries the `ComposerStart`: `kind`, `have`, `want`, `sale` (slugs), `alsoPay`, `alsoSwap`, plus `edit` (the anchor slug, for Edit post) and `from` (where to return).
- `from` is accepted only as a same-origin path starting with `/`, so it can't redirect off the site. A missing or bad `from` returns to `/trade`.
- A signed-out visitor is redirected in `beforeLoad` to `/login?redirect=…`, as New post does today.
- *Alternative:* keep the dialog and widen it. Rejected: the prototype showed stacked dialogs and a cramped preview.

**2. Callers navigate.**
- `composerSearch(start, from)` in `features/trade/composer/link.ts` (pure, tested) turns a `ComposerStart` into the route's search, `replaces` travelling as `edit`. Callers open the page through `useOpenComposer()(start)`, which navigates with the current href as `from`, in place of each `openWith` call.
- `useComposer`, `PostComposer` and the dialog chrome go. `Composer`'s body moves into `features/trade/composer/`:
  - `page.tsx` for the layout;
  - `settings.tsx` for the kind segment, the list dropdowns, the options and Post;
  - `preview.tsx` for the preview, its sides and the sheets.
  Each file stays well under the size the old dialog had reached.
- The composer's local state stays as it is: `Choice` in `useState`, seeded from the search once (keyed by the search). The URL is not rewritten on every pick.

**3. Kind as a segmented `RadioGroup`, lists as `Select`.**
- The kind segment reuses `RadioPrimitive` (as `KindStep` does), in three columns, with `KIND_DESC` for the picked one beneath it.
- Each side is a `Select` whose items are that type's lists. A blocked list is a disabled item showing `rowNote` (the same `rowBlock` the radio rows use), and an optional side has No list.
- The unpair prompt (`pairedPartner`, `unpairText`) shows under the dropdown it concerns.
- `ListSection` and its radio rows go with the dialog. `OptionCheck`, `UnpairedNote` and the text helpers stay.

**4. Preview, a new component.** It is built from the picks: `previewTags`, `matchLines`, the list names, `listEntries` thumbnails for each side (23 shown, then "+N"), and `list.rules` for the want side. It is not the feed's `PostSide`: that one renders a stored post with match rings and the viewer's counts, and this one renders a draft of the poster's own lists. Its tiles use the objekt artwork component the list page uses, at a fixed small width.

**5. Side sheet for rules and for "+N".**
- One `Sheet` (`components/ui/sheet`) on the page shows either the rule form or a side's full objekt grid.
- `RuleForm` is exported from `rule-dialog.tsx` and rendered inside `SheetPopup`. Its `DialogHeader`, `DialogTitle` and `DialogFooter` work there, because Sheet is built on the same Base UI dialog primitive. Its Cancel is a `DialogClose`, which closes the sheet.
- `RuleDialog` stays for the list page.

**6. New want list.** A button beside the want dropdown expands to a name field with Create. Create calls `useCreateList` with `listType: "want"`, no profile, no link and `discoverable: false`. Its mutate-level `onSuccess` picks the new slug through `pickList`. That runs after the hook's own `onSuccess` has awaited the current-user refetch, so `usePlanLists` already holds the list when it is picked. On error the hook's toast explains, and the field keeps the name.

**7. Ratios in the preview (needs `trade-ratio`).**
- "Ratio for all" sits by each side's list name, and each thumbnail and rule row is a popover trigger offering 1:1 and 2–5.
- They call `list.edit` (the list's ratio), `list.setRatio` and `list.updateRule`, all from `trade-ratio`, and invalidate the list's entries, rules and `orpc.trade.key()`.
- An objekt or rule following the list shows the chip in its inherited style (`RatioChip`'s `inherited`).
- Not offered on a sale side, or on a Buy post's want side.

**8. Post and return.** Post calls `trade.savePost` as now. On success it navigates to `from` (or `/trade`), with the existing toast. Leaving without posting needs no warning: everything else on the page has already saved.

## Risks / Trade-offs

- [Tabs and links still opening the old dialog after deploy] → The dialog lives only in client code, so an open tab keeps its old bundle until reload. Nothing on the server changes.
- [A long `/trade/new?…` URL] → It holds at most four short slugs and two flags.
- [Saves made before Post (rules, lists, ratios) feel like a draft] → The spec states they persist. The sheet and popovers close on save with the existing toasts, so each save is visible.
- [Phone layout] → The preview stacks below the settings, and Post sits in a bottom bar. The browser task checks 390 px.
