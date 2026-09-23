# Registry components

Every file here except `chart.tsx` is a vendored copy of a shadcn-style registry item: 31 from
cnippet (`https://ui.cnippet.dev/r/<name>.json`, configured as `@cnippet` in
`apps/web/components.json`) and `color-picker.tsx` from Neon (`https://ui.neon.com/r/color-picker.json`).
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

## Local edits

| File               | Edit                                                                                                                                                                     | Why                                                                                                                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `badge.tsx`        | `error`, `info`, `success`, `warning` variants add `border-<token>/30` (dark: `/20`)                                                                                     | Inherited from the lab prototype (`81189a66`): the tinted feedback chips get a visible edge in both themes. No design note records a bug behind it.                                                             |
| `popover.tsx`      | `padding` prop on `PopoverPopup` (`default` / `sm` / `none`) via a `VIEWPORT_PADDING` map; the fixed `py-4 [--viewport-inline-padding:--spacing(4)]` moved into that map | cnippet pads the popup's viewport, so a caller adding its own `p-*` doubled the inset. Callers pick the inset here instead.                                                                                     |
| `select.tsx`       | `min-w-36` removed from `selectTriggerVariants`                                                                                                                          | The intrinsic 144px minimum made the Currency select overflow the Create list dialog (`design/base-ui-prototype-findings.md`); callers size the trigger.                                                        |
| `select.tsx`       | `SelectGroupLabel` accepts `className` and merges it with `cn()`                                                                                                         | The registry copy spread `props` after its own `className`, so a passed class replaced the base styles; needed to make the artist group label sticky.                                                           |
| `color-picker.tsx` | Hugeicons glyphs replaced by Phosphor `EyedropperIcon`, `CopyIcon`, `CheckIcon`; the `neon-tokens` registry dependency skipped                                           | No second icon package for three icons; every token the file names already exists in `app.css`.                                                                                                                 |
| `color-picker.tsx` | `z-50` on `Popover.Positioner`; the hex input gets `name="hex"`                                                                                                          | The registry put `z-50` on the static `Popover.Popup`, so the picker painted under the mobile Filters sheet; the positioned element is the Positioner. The nameless input was a devtools warning on every open. |

## Not a registry copy

`chart.tsx` is a port of `apps/website/src/components/intentui/chart.tsx` trimmed to what the
Progress and Statistics charts use (container, tooltip, tooltip content). cnippet publishes a
`chart` item with the same name; do not overwrite this file with it.
