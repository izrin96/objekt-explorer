# Registry components

Every file here is a vendored copy of a shadcn-style registry item from
cnippet (`https://ui.cnippet.dev/r/<name>.json`, configured as `@cnippet` in
`apps/web/components.json`).
They are kept verbatim so an update is an overwrite, not a merge. Override styling at the usage
site or through the tokens in `src/styles/app.css`, never here. The exceptions below are the
whole list of local edits; re-apply them after any overwrite.

## Updating

From `apps/web`:

```bash
bunx shadcn@latest add @cnippet/<name> --overwrite
```

Then format (`bunx oxfmt src/components/ui`), re-apply the edits below, and run
`bun run lint --filter=web`, `bun run typecheck --filter=web`, `bun run build --filter=web`.

To see whether upstream has moved before overwriting, fetch the item with curl (the registry
returns 403 to non-browser user agents such as Python's `urllib`), rewrite
`@/registry/default/{ui,lib,hooks}/` to `@/components/ui/`, `@/lib/`, `@/hooks/`, format the
copy with the repo's oxfmt config, and diff. On 2026-09-23 the 27 files not listed below were
byte-identical to upstream after that normalisation.

## Variants

cnippet ships about 980 usage examples beside its primitives, `v-<component>-<n>.tsx` under
[`apps/v2/registry/default/variants`](https://github.com/cnippet-dev/ui-cnippet/tree/main/apps/v2/registry/default/variants)
(15–30 per component: empty states, tables, toolbars, input groups with a `Kbd` hint, and so on).
Each is also a registry item, fetchable as `https://ui.cnippet.dev/r/v-empty-1.json` with a browser
user agent. Before composing a new pattern or a `components/shared` wrapper, read the variants of the
primitives involved and build from the closest one.

- A variant is a composition, so it lands in `features/*` or `components/shared/*`, never in this
  folder. Add the primitives it imports with `shadcn add` as above.
- A variant tracks the latest primitives and may use a prop or size the copies here lack: run the
  drift check for each primitive it imports first, and update the primitive if it has moved.
- The design is monochrome chrome with class colour as the only accent: take a variant's structure
  and leave its colour and decorative motion. The `motion/` and `motion-variants/` folders rarely fit.

Tables: a static table is `table`, with an outer `bg-card rounded-lg border overflow-hidden` box
carrying `data-scroll-x`, since `Table` wraps itself in a scroll container that takes no props
(`features/profile/trades/trades-view.tsx`). A windowed table stays on `components/shared/data-table`
with ARIA table roles, because `virtua` cannot window `<tr>`s (Activity). The objekt drawer's tables
keep their raw `<table>` inside a focusable `role="region"` scroller: `Table`'s own container would
take the scroll, and the arrow keys would stop moving it.

`frame` is vendored for the Trade feed's rows (`features/trade/person-row-view.tsx`): a person is a
`Frame`, each of their lists a `FramePanel`. The hand-drawn `rounded-lg border` panels (Messages,
account sections) could move to it too; it changes their look, so that waits on a design call.

## Local edits

| File          | Edit                                                                                                                                                                     | Why                                                                                                                                                              |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `badge.tsx`   | `error`, `info`, `success`, `warning` variants add `border-<token>/30` (dark: `/20`)                                                                                     | Inherited from the lab prototype (`81189a66`): the tinted feedback chips get a visible edge in both themes. No design note records a bug behind it.              |
| `command.tsx` | `CommandInput` destructures `placeholder` without the registry's `= undefined` default                                                                                   | oxlint's `no-useless-default-assignment` is a correctness error, so the verbatim copy fails `lint`. Behaviour is identical.                                      |
| `popover.tsx` | `padding` prop on `PopoverPopup` (`default` / `sm` / `none`) via a `VIEWPORT_PADDING` map; the fixed `py-4 [--viewport-inline-padding:--spacing(4)]` moved into that map | cnippet pads the popup's viewport, so a caller adding its own `p-*` doubled the inset. Callers pick the inset here instead.                                      |
| `select.tsx`  | `min-w-36` removed from `selectTriggerVariants`                                                                                                                          | The intrinsic 144px minimum made the Currency select overflow the Create list dialog (`design/archive/base-ui-prototype-findings.md`); callers size the trigger. |
| `select.tsx`  | `SelectGroupLabel` accepts `className` and merges it with `cn()`                                                                                                         | The registry copy spread `props` after its own `className`, so a passed class replaced the base styles; needed to make the artist group label sticky.            |
