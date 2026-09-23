## Context

See proposal.md — Why. `apps/website` is the reference for the Start wiring
(`vite.config.ts`, `src/router.tsx`, `src/routes/__root.tsx`, `src/client.tsx`, `src/server.ts`,
`server.ts`, `tsconfig.json`, `oxlint.config.ts`, `project.inlang`). `apps/lab` is the
reference for everything visible: `styles/app.css`, `components/ui`, `components/shared`,
`routes/root.tsx`, `store/settings.ts`, `lib/utils.ts`, `lib/dev-overflow-guard.ts`, and the
pre-paint theme script in `index.html`. The lab is a client-only Vite app; the shell has to
reproduce its behaviour under SSR.

## Goals / Non-Goals

**Goals:**

- A `web` app that builds, lints at 0/0 and type-checks with only the shell inside it.
- Every copied lab file is byte-identical except for import paths and the `lab:` → `web:`
  storage-key rename, so later registry updates and lab diffs stay mechanical.
- The lab's dev tooling (overflow guard, `data-overflow-guard`, `data-scroll-x`) lands as a
  set, per port note 4 of `design/lab-code-review.md`.

**Non-Goals:**

- Any data, session or navigation. The nav is C2 because it needs the session and search.
- Choosing chunking or preload strategy beyond what the website already does.

## Decisions

**1. Theme and width come from the lab's settings store, not `tanstack-theme-kit`.**
The lab's `useSettings` (zustand + `persist`) already carries `theme`, `language` and `wide`,
and its user menu (C2) reads them. `tanstack-theme-kit` would add a second theme source.
SSR needs the theme before hydration, which the lab solves with an inline script in
`index.html`; the shell moves that script into the root document's `<head>` as a blocking
`<script>` that reads `localStorage["web:settings"]`, toggles `.dark` and `data-wide` on
`<html>`, and `useApplySettings` keeps them in sync afterwards. `<html suppressHydrationWarning>`
covers the class the script adds. Alternative considered: a cookie-based theme so the server
renders the class — more moving parts, and the lab's rule already works.

**2. Copy, then rename; never import across apps.** `components/ui/*`, `components/shared/*`
(minus `not-implemented.ts`, a lab stub helper), `lib/*`, `hooks/*` and `store/settings.ts` are
copied with `cp`, then `@/store/` → `@/stores/` and `lab:` → `web:` are the only edits.
`components/ui/color-picker.tsx` keeps its commented local-fix block (port note 7).
`components.json` is copied so `bunx shadcn add @cnippet/<name>` keeps working in `web`.

**3. Vite config is the website's minus react-aria.** Keep `paraglideVitePlugin`,
`tailwindcss`, `tanstackStart({ srcDirectory: "src" })`, `viteReact`, `babel` with
`reactCompilerPreset`, `ssr.noExternal` on build, `external: ["bun"]`. Drop
`@react-aria/optimize-locales-plugin` and the `ui` chunk group; add a `base-ui` group
matching `node_modules/@base-ui/`. Port 3200.

**4. Root route mirrors `website`'s `__root.tsx` shape with lab content.**
`createRootRouteWithContext<{ queryClient }>()`, `head()` built with `tanstack-meta`'s
`generateMetadata` (copied `lib/meta.ts`, `SITE_NAME` local to `lib/utils.ts` until C2 can
import it from `@repo/api/constants`), the same preconnects, favicon and manifest links,
`appCss?url` stylesheet link, `shellComponent` rendering `<html lang={getLocale()}>` with the
theme script, `<body className="bg-background text-foreground font-sans antialiased">`.
The `component` renders `ToastProvider` → `overflow-x-clip` div → `<Outlet />`, plus
`OverflowGuard` under `import.meta.env.DEV`. No loader yet.

**5. Layout lives in `(container)/route.tsx`.** The lab's `<main data-overflow-guard className={cn(containerClass, "flex flex-col gap-4.5 px-5 pt-5 pb-10")}>`
becomes the `(container)` pathless layout, so `@{$nickname}` routes (C5) can opt out the way
the website's profile banner does. `containerClass` keeps the `[[data-wide]_&]:max-w-none`
variant.

**6. Router components are rebuilt, not copied.** `website`'s error, not-found and pending
components import intentui. `web`'s are three small files using `EmptyState`, `Button` and
`Spinner` from the copied kit, with strings through `m.*` (reusing the website's existing
`notfound_*` / `error_*` keys where they exist).

**7. Dependencies.** From the lab: `@base-ui/react`, `@phosphor-icons/react`, `lucide-react`
(cnippet registry files import it), `class-variance-authority`, `clsx`, `tailwind-merge`,
`zustand`, `zod` (`catalog:`), `date-fns`, `chroma-js`, `react-day-picker`, `recharts`,
`@dnd-kit/*`, the three lab fonts plus `@fontsource-variable/noto-sans-kr` and
`noto-sans-sc` from the website for `ko`/`ja`. From the website: `@tanstack/react-start`,
`@tanstack/react-router`, `@tanstack/react-query`, `@tanstack/react-router-ssr-query`,
`@inlang/paraglide-js` (+ `-react`), `tanstack-meta`, `core-js`, `@t3-oss/env-core` for
`lib/env/client.ts`. Everything else (`@orpc/*`, `better-auth`, `virtua`, `motion`,
`react-hook-form`, `@stream-io/*`) enters with the slice that uses it. Versions match the
existing apps exactly; nothing new is added to the root catalog.

**8. Paraglide.** `project.inlang/settings.json` and `messages/{en,ko,ja}.json` are copied
whole. `typecheck` runs `paraglide:compile` first, as in `website`; `src/paraglide` and
`src/routeTree.gen.ts` are lint-ignored and git-ignored the same way.

## Risks / Trade-offs

- [Theme flash on first SSR paint if the inline script runs after CSS] → the script is the
  first child of `<head>`, before `HeadContent`; verify by hard-reloading with `Dark` set and
  recording a performance trace or a slow-motion screen capture.
- [Hydration mismatch from `.dark` / `data-wide` added before React mounts] →
  `suppressHydrationWarning` on `<html>`; confirm the console is clean on load.
- [`lucide-react` and `@phosphor-icons/react` both in the bundle] → accepted; registry
  files own lucide, app code owns Phosphor, and the `base-ui` chunk isolates the kit.
- [knip flags the ~90 unused registry exports in `components/ui`] → expected and advisory,
  same as `apps/lab`; do not delete exports from registry files.
- [Four dev servers on `bun run dev`] → documented in AGENTS.md at C8; until then use
  `--filter=web`.

## Migration Plan

Additive only. Nothing deploys; `web` has no Dockerfile until C8.
