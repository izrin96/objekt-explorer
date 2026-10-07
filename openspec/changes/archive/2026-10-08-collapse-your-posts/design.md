## Context

- `features/trade/my-posts.tsx` renders Your posts from `myPostsOptions()` (`trade.myPosts`), which the `/trade` loader reads before the first paint. It returns nothing while pending or when the viewer has no posts. Each post carries `listed` (false means idle) and `nextBumpAt` (null means it can be bumped now).
- Per-browser view choices already live in the persisted settings store (`stores/settings.ts`, key `web:settings`), for example `hideBanner`, which collapses profile banners.
- `components/ui/collapsible.tsx` (Base UI Collapsible) already backs the expanding rows in `features/trade/partner-row.tsx`.

## Goals / Non-Goals

**Goals:**
- The behaviour in the spec delta, with no layout jump on load beyond a viewer's own saved choice.

**Non-Goals:**
- Server-side knowledge of the choice (a cookie): the default already matches most visits, and the store is the project's place for view choices.

## Decisions

**The choice is a setting.** `useSettings` gains `myPostsShown: boolean | null`, where null means no choice yet, so the default rule applies. A new store was rejected because this is one more view preference beside `hideBanner`, and it gets the same persistence and legacy-safe storage.

**The default is computed from the data.** `shownByDefault = posts.some((post) => !post.listed)`. Bumpable posts do not open the row; they are counted in the summary. That is a deliberate change from "open when anything can be bumped", since a bump is open on most posts most of the time.

**Hydration-safe open state.** The server cannot read `localStorage`. The component renders the data default until `useHydrated()` is true, then `myPostsShown ?? shownByDefault`. The server HTML and the first client render therefore agree, and only a viewer whose saved choice differs from the default sees the row change once.

**The Collapsible primitive.** Base UI Collapsible gives the trigger `aria-expanded` and `aria-controls` and animates the panel height, as partner rows already do. The trigger is a ghost button reading Show or Hide at the end of the summary row. The whole row is not the trigger, so the counts stay selectable text. The posts list itself is unchanged inside the panel.

**Counts in one line.** The summary uses `·` separators: "5 listed · 1 idle · 2 ready to bump". A zero part is left out, except "listed", which is always shown. The idle count uses the same outline Idle badge styling as the post rows, so it reads as needing attention.

## Risks / Trade-offs

- [A post goes idle while the viewer has saved Hide] → by the spec the choice wins. The summary row still counts it, so the idle state stays visible without overriding the viewer.
- [Storage is blocked (private mode)] → the persist storage already falls back. The row then follows the default on every visit.
