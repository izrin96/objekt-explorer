# Design

## Context

The composer's picks are page state holding list slugs (`Choice` in `features/trade/composer-choice.ts`), and the preview already edits picked lists in place through the list page's own mutations: `AddObjektsSheet`, `RuleForm` and the ratio controls. The list page edits a list through `EditListDialog` (`features/list/edit-list-dialog.tsx`), whose form carries a `TradeLine` whose Edit post or Post it opens the composer.

## Goals / Non-Goals

**Goals:**
- Reuse the list page's edit form unchanged for every other caller.
- Keep every pick valid across any save the form allows.

**Non-Goals:**
- A composer-only edit form, or editing fields inline in the preview.

## Decisions

**Reuse `EditListDialog`, not a new form.** Its validation, slug preview, profile rules and `useEditList` mutation (with its invalidation and toasts) are what the list page uses; a second form would drift. Feature order allows it: trade imports list.

**Hide the Trade line with a `showTradeLine` prop (default on).** The line's only actions reopen `/trade/new`, which would remount the page and drop the picks. A boolean beats passing the line in as a slot while the composer is the only caller that wants something different; move to a slot if a third variant appears.

**Picks stay valid without remapping.** The form keeps the list type fixed in edit mode, "Regenerate URL" changes only the profile URL slug (not `list.slug`, which the picks hold), and `toEditInput` sends neither `linkedListId` nor `matchSale` / `matchHave`, so a list edit cannot fight what Post saves. `useEditList` invalidates the current user, so `usePlanLists` refetches and a rename reaches the preview and dropdown.

**Pass `finalFocus` the button's ref.** Base UI returns focus to the previously focused element when a dialog has no trigger, but Safari does not focus a clicked button, so that element would be the page. `CreateListDialog` takes the same prop for its own reason.

**The button sits outside the side's `h3`.** A heading holding a control reads poorly to a screen reader; the heading and an `icon-xs` ghost button share a row instead.

## Risks / Trade-offs

- [The 24 px button makes the picked side's heading row taller than an empty side's] → check both widths in the browser; align the rows if the side-by-side layout looks uneven.
- [The form also shows Ratio for all, which the preview edits too] → both read `listFindOptions`, and the form sends the ratio only when it changed, so the two never overwrite each other with a stale value.
