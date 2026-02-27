# Next.js to TanStack Start Migration Plan

## Overview

Migrate `apps/web` (Next.js 16) to `apps/website` (TanStack React Start + Vite). The `apps/website` directory currently only has a `README.md` and needs to be fully built out.

## Key Differences: Next.js vs TanStack Start

| Concern | Next.js (apps/web) | TanStack Start (apps/website) |
|---|---|---|
| Routing | App Router file-based | TanStack Router file-based (`routes/`) |
| Server functions | Server Components, `"use server"` | `createServerFn()` |
| API routes | `app/api/*/route.ts` | `app/api/*/route.ts` (Vinxi/H3 handlers) |
| Headers/Cookies | `next/headers` | `@tanstack/start/server` (`getHeaders`, `getCookie`) |
| Navigation | `next/navigation` | `@tanstack/react-router` |
| Images | `next/image` | Plain `<img>` or `@unpic/react` |
| Fonts | `next/font/google` | CSS `@font-face` or Fontsource |
| Dynamic imports | `next/dynamic` | `React.lazy` + `Suspense` |
| Scripts | `next/script` | Plain `<script>` |
| i18n | `next-intl` | `@tanstack/react-router` + custom i18n |
| URL state | `nuqs/adapters/next/app` | `nuqs/adapters/tanstack-router` |
| Metadata | `export const metadata` / `generateMetadata` | `<Head>` component in route |
| Redirects | `redirect()` from `next/navigation` | `redirect()` from `@tanstack/react-router` |
| `notFound()` | `notFound()` from `next/navigation` | `notFound()` from `@tanstack/react-router` |
| `cache()` | React `cache()` | React `cache()` (same) |
| `after()` | `next/server` `after()` | No direct equivalent — use background task |
| Auth handler | `toNextJsHandler(auth)` | `auth.handler(request)` (better-auth) |
| ORPC handler | `RPCHandler` with Next.js route | `RPCHandler` with H3/Vinxi event handler |

---

## Route Mapping

### Next.js App Router → TanStack Router

| Next.js Route | TanStack Router File | URL |
|---|---|---|
| `app/(container)/page.tsx` | `routes/index.tsx` | `/` |
| `app/(container)/activity/page.tsx` | `routes/activity.tsx` | `/activity` |
| `app/(container)/login/page.tsx` | `routes/login.tsx` | `/login` |
| `app/(container)/auth/reset-password/page.tsx` | `routes/auth/reset-password.tsx` | `/auth/reset-password` |
| `app/(container)/auth/verified/page.tsx` | `routes/auth/verified.tsx` | `/auth/verified` |
| `app/(container)/link/page.tsx` | `routes/link/index.tsx` | `/link` |
| `app/(container)/link/connect/page.tsx` | `routes/link/connect.tsx` | `/link/connect` |
| `app/(container)/list/page.tsx` | `routes/list/index.tsx` | `/list` |
| `app/(container)/list/[slug]/page.tsx` | `routes/list/$slug.tsx` | `/list/:slug` |
| `app/(container)/live/page.tsx` | `routes/live/index.tsx` | `/live` |
| `app/(container)/live/[id]/page.tsx` | `routes/live/$id.tsx` | `/live/:id` |
| `app/(container)/terms-privacy/page.tsx` | `routes/terms-privacy.tsx` | `/terms-privacy` |
| `app/(container)/profile-list/[nickname]/[slug]/page.tsx` | `routes/@$nickname/list/$slug.tsx` | `/@:nickname/list/:slug` |
| `app/profile/[nickname]/layout.tsx` | `routes/@$nickname.tsx` (layout) | `/@:nickname` |
| `app/profile/[nickname]/page.tsx` | `routes/@$nickname/index.tsx` | `/@:nickname` |
| `app/profile/[nickname]/trades/page.tsx` | `routes/@$nickname/trades.tsx` | `/@:nickname/trades` |
| `app/profile/[nickname]/progress/page.tsx` | `routes/@$nickname/progress.tsx` | `/@:nickname/progress` |
| `app/profile/[nickname]/stats/page.tsx` | `routes/@$nickname/stats.tsx` | `/@:nickname/stats` |
| `app/profile/[nickname]/list/page.tsx` | `routes/@$nickname/list/index.tsx` | `/@:nickname/list` |

> **Note:** Next.js uses URL rewrites for `/@:nickname` → `/profile/:nickname`. In TanStack Router, we can use `@$nickname` as a literal route segment prefix.

### API Routes → Vinxi/H3 Event Handlers

| Next.js API Route | TanStack Start API Route |
|---|---|
| `app/api/auth/[...all]/route.ts` | `app/api/auth/$.ts` |
| `app/rpc/[[...rest]]/route.ts` | `app/api/rpc/$.ts` |
| `app/api/activity/route.ts` | `app/api/activity.ts` |
| `app/api/collection/route.ts` | `app/api/collection.ts` |
| `app/api/healthcheck/route.ts` | `app/api/healthcheck.ts` |
| `app/api/live-sessions/route.ts` | `app/api/live-sessions.ts` |
| `app/api/objekts/list/[collectionSlug]/route.ts` | `app/api/objekts/list/$collectionSlug.ts` |
| `app/api/objekts/metadata/[collectionSlug]/route.ts` | `app/api/objekts/metadata/$collectionSlug.ts` |
| `app/api/objekts/owned-by/[address]/route.ts` | `app/api/objekts/owned-by/$address.ts` |
| `app/api/objekts/transfers/[collectionSlug]/[serial]/route.ts` | `app/api/objekts/transfers/$collectionSlug/$serial.ts` |
| `app/api/open-app/route.ts` | `app/api/open-app.ts` |
| `app/api/transfers/[address]/route.ts` | `app/api/transfers/$address.ts` |
| `app/api/user/search/route.ts` | `app/api/user/search.ts` |

---

## Detailed Migration Steps

### Phase 1: Set up apps/website TanStack Start project structure

Create the following directory structure in `apps/website/`:

```
apps/website/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── app.config.ts          # TanStack Start config
├── turbo.json
├── .gitignore
├── .oxlintrc.json
├── public/                # Copy from apps/web/public/
├── messages/              # Copy from apps/web/messages/
├── src/
│   ├── env.ts
│   ├── client.tsx         # Client entry point
│   ├── router.tsx         # Router definition
│   ├── routeTree.gen.ts   # Auto-generated
│   ├── app/
│   │   ├── api/           # API route handlers (H3/Vinxi)
│   │   └── ssr.tsx        # SSR entry
│   ├── routes/
│   │   ├── __root.tsx     # Root layout (replaces app/layout.tsx)
│   │   ├── index.tsx
│   │   ├── activity.tsx
│   │   ├── login.tsx
│   │   ├── terms-privacy.tsx
│   │   ├── auth/
│   │   │   ├── reset-password.tsx
│   │   │   └── verified.tsx
│   │   ├── link/
│   │   │   ├── index.tsx
│   │   │   └── connect.tsx
│   │   ├── list/
│   │   │   ├── index.tsx
│   │   │   └── $slug.tsx
│   │   ├── live/
│   │   │   ├── index.tsx
│   │   │   └── $id.tsx
│   │   └── @$nickname/
│   │       ├── index.tsx
│   │       ├── trades.tsx
│   │       ├── progress.tsx
│   │       ├── stats.tsx
│   │       └── list/
│   │           ├── index.tsx
│   │           └── $slug.tsx
│   ├── components/        # Copy from apps/web/src/components/
│   ├── hooks/             # Copy from apps/web/src/hooks/
│   ├── i18n/              # Adapted from apps/web/src/i18n/
│   └── lib/
│       ├── auth-client.ts
│       ├── data-fetching.ts
│       ├── filter-utils.ts
│       ├── objekt-utils.ts
│       ├── primitive.ts
│       ├── query-options.ts
│       ├── unobtainables.ts
│       ├── utils.ts
│       ├── orpc/
│       │   ├── client.ts
│       │   └── server.ts  # Adapted (no next/headers)
│       ├── query/
│       │   ├── client.ts
│       │   └── hydration.tsx
│       ├── server/
│       │   ├── auth.ts    # Adapted (no next/headers, no after())
│       │   ├── cookie.ts  # Adapted (no next/headers)
│       │   ├── jwt.ts
│       │   ├── locale.ts  # Adapted (no next/headers)
│       │   ├── mail.ts
│       │   ├── objekt.ts
│       │   ├── redis.ts
│       │   ├── s3.ts
│       │   ├── token.ts
│       │   ├── utils.ts
│       │   ├── cosmo/
│       │   │   └── artists.ts
│       │   └── api/
│       │       ├── orpc.ts  # Adapted (no next/headers)
│       │       └── routers/
│       │           ├── index.ts
│       │           ├── config.ts  # Adapted (no next/headers)
│       │           ├── cosmo-link.ts  # Adapted (no next-intl/server)
│       │           ├── list.ts
│       │           ├── locked-objekts.ts
│       │           ├── meta.ts
│       │           ├── pins.ts
│       │           ├── profile.ts  # Adapted (no next-intl/server)
│       │           └── user.ts    # Adapted (no next-intl/server)
│       └── universal/
│           ├── activity.ts
│           ├── collection-grid.ts
│           ├── transfers.ts
│           ├── user.ts
│           └── cosmo/
│               └── filter-data.ts
```

### Phase 2: Migrate package.json and configuration files

**`apps/website/package.json`** — Replace Next.js deps with TanStack Start:

Remove:
- `next`, `next-intl`, `@t3-oss/env-nextjs`, `babel-plugin-react-compiler`

Add:
- `@tanstack/react-start` (TanStack Start)
- `@tanstack/react-router` (TanStack Router)
- `@tanstack/router-devtools`
- `@tanstack/start` (server utilities)
- `vite`
- `@vitejs/plugin-react`
- `vinxi`
- `@tanstack/router-vite-plugin`
- `@tanstack/react-router-with-query`
- `@t3-oss/env-core` (instead of `@t3-oss/env-nextjs`)

Keep all other deps the same (ORPC, better-auth, drizzle, etc.)

**`apps/website/vite.config.ts`**:
```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-vite-plugin";

export default defineConfig({
  plugins: [
    TanStackRouterVite({ routesDirectory: "./src/routes" }),
    react({ babel: { plugins: [["babel-plugin-react-compiler"]] } }),
  ],
});
```

**`apps/website/app.config.ts`** (TanStack Start config):
```ts
import { defineConfig } from "@tanstack/react-start/config";
import viteTsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  vite: {
    plugins: [viteTsConfigPaths({ projects: ["./tsconfig.json"] })],
  },
  server: {
    preset: "bun",
  },
});
```

### Phase 3: Migrate environment variables (env.ts)

Replace `@t3-oss/env-nextjs` with `@t3-oss/env-core`:

```ts
// src/env.ts
import { createEnv } from "@t3-oss/env-core";
import * as z from "zod";

export const env = createEnv({
  server: { /* same server vars */ },
  clientPrefix: "VITE_",
  client: {
    VITE_SITE_URL: z.string().min(1),
    VITE_UMAMI_SCRIPT_URL: z.string().min(1).optional(),
    VITE_UMAMI_WEBSITE_ID: z.string().min(1).optional(),
    VITE_ACTIVITY_WEBSOCKET_URL: z.string().min(1),
    VITE_LIVE_API_KEY: z.string().min(1),
  },
  runtimeEnv: process.env,
});
```

> **Note:** Rename `NEXT_PUBLIC_*` env vars to `VITE_*` in `.env.example` and update all references.

### Phase 4: Migrate server-side infrastructure

#### `lib/server/auth.ts`
- Remove `import { headers } from "next/headers"` → use `getHeaders()` from `@tanstack/start/server`
- Remove `import { after } from "next/server"` → use `waitUntil()` or fire-and-forget pattern
- `getSession` function: replace `await headers()` with `getHeaders()` from TanStack Start

```ts
// Before (Next.js)
import { headers } from "next/headers";
export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() })
);

// After (TanStack Start)
import { getHeaders } from "@tanstack/start/server";
export const getSession = cache(async () =>
  auth.api.getSession({ headers: getHeaders() })
);
```

#### `lib/server/cookie.ts`
- Replace `cookies()` from `next/headers` with `getCookie()` from `@tanstack/start/server`

```ts
// Before
import { cookies } from "next/headers";
const value = (await cookies()).get("artists")?.value;

// After
import { getCookie } from "@tanstack/start/server";
const value = getCookie("artists");
```

#### `lib/server/locale.ts`
- Remove `"use server"` directive (not needed in TanStack Start)
- Replace `cookies()` from `next/headers` with `getCookie`/`setCookie` from `@tanstack/start/server`

#### `lib/server/api/orpc.ts`
- Replace `headers()` from `next/headers` with `getHeaders()` from `@tanstack/start/server`

#### `lib/server/api/routers/config.ts`
- Replace `cookies()` from `next/headers` with `getCookie`/`setCookie` from `@tanstack/start/server`

#### `lib/server/api/routers/user.ts`, `profile.ts`, `cosmo-link.ts`
- Replace `getTranslations` from `next-intl/server` with custom i18n solution (see Phase 11)

#### `lib/orpc/server.ts`
- Remove `"server only"` directive
- Replace `headers()` from `next/headers` with `getHeaders()` from `@tanstack/start/server`

### Phase 5: Migrate API routes to TanStack Start API handlers

TanStack Start uses Vinxi/H3 for API routes. The format changes from Next.js route handlers to H3 event handlers.

**Auth route** (`app/api/auth/$.ts`):
```ts
// Before (Next.js)
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/server/auth";
export const { POST, GET } = toNextJsHandler(auth);

// After (TanStack Start / H3)
import { auth } from "@/lib/server/auth";
export default defineEventHandler((event) => {
  return auth.handler(toWebRequest(event));
});
```

**ORPC route** (`app/api/rpc/$.ts`):
```ts
// Before (Next.js)
export const GET = handleRequest;
export const POST = handleRequest;
// ...

// After (TanStack Start / H3)
import { RPCHandler } from "@orpc/server/fetch";
export default defineEventHandler(async (event) => {
  const request = toWebRequest(event);
  const { response } = await handler.handle(request, { prefix: "/api/rpc" });
  return response ?? new Response("Not found", { status: 404 });
});
```

**Other API routes** — Convert `NextRequest` to standard `Request`, `NextResponse` to `Response`:
```ts
// Before
export async function GET(request: NextRequest) {
  return NextResponse.json({ ... });
}

// After (H3 event handler)
export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  return { ... }; // H3 auto-serializes to JSON
});
```

### Phase 6: Migrate ORPC router

The ORPC router itself is framework-agnostic. The only changes needed are:
1. Replace `next/headers` imports with TanStack Start equivalents
2. Replace `next-intl/server` `getTranslations` with custom i18n

The `lib/orpc/client.ts` needs the URL updated from `/rpc` to `/api/rpc`.

### Phase 7: Migrate root layout and providers

**`routes/__root.tsx`** (replaces `app/layout.tsx`):

```tsx
import { createRootRoute, Outlet, ScrollRestoration } from "@tanstack/react-router";
import { Meta, Scripts } from "@tanstack/react-start";
import ClientProviders from "@/components/client-providers";
import Navbar from "@/components/navbar";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { title: "Objekt Tracker" },
      { name: "description", content: "Cosmo objekt explorer" },
    ],
    links: [
      // Fonts via CSS @font-face or Fontsource
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Meta />
      </head>
      <body className="min-h-svh font-sans antialiased">
        <ClientProviders>
          <Navbar />
          <main className="mx-auto w-full">
            <Outlet />
          </main>
        </ClientProviders>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
```

**Server-side data prefetching** — In TanStack Start, use `loader` in route definitions:

```tsx
// routes/__root.tsx
export const Route = createRootRoute({
  loader: async () => {
    const queryClient = getQueryClient();
    await Promise.all([
      queryClient.prefetchQuery(orpc.config.getArtists.queryOptions()),
      queryClient.prefetchQuery({ queryKey: ["session"], queryFn: getSession }),
      queryClient.prefetchQuery(orpc.config.getFilterData.queryOptions()),
    ]);
    return { dehydratedState: dehydrate(queryClient) };
  },
  component: RootComponent,
});
```

**`components/client-providers.tsx`** changes:
- Replace `NuqsAdapter` from `nuqs/adapters/next/app` → `nuqs/adapters/tanstack-router`
- Replace `useRouter` from `next/navigation` → `useRouter` from `@tanstack/react-router`
- Replace `RouterProvider` navigate prop with TanStack Router navigate

### Phase 8: Migrate page routes (container pages)

Each Next.js page becomes a TanStack Router route file. The pattern:

**Before (Next.js)**:
```tsx
// app/(container)/activity/page.tsx
export async function generateMetadata() { ... }
export default function Page() { return <ActivityRender />; }
```

**After (TanStack Start)**:
```tsx
// routes/activity.tsx
import { createFileRoute } from "@tanstack/react-router";
import { seo } from "@/lib/seo"; // custom SEO helper

export const Route = createFileRoute("/activity")({
  head: () => ({ meta: seo({ title: "Activity" }) }),
  component: ActivityPage,
});

function ActivityPage() {
  return <ActivityRender />;
}
```

**Pages with server-side redirects** (e.g., `/list`, `/link`):
```tsx
// routes/list/index.tsx
export const Route = createFileRoute("/list/")({
  loader: async () => {
    const session = await getSession();
    if (!session) throw redirect({ to: "/" });
    const queryClient = getQueryClient();
    await queryClient.prefetchQuery(orpc.list.list.queryOptions());
    return { dehydratedState: dehydrate(queryClient) };
  },
  component: ListPage,
});
```

**Pages with dynamic params** (e.g., `/list/$slug`):
```tsx
// routes/list/$slug.tsx
export const Route = createFileRoute("/list/$slug")({
  loader: async ({ params }) => {
    const list = await getList(params.slug);
    // ...
    return { list, dehydratedState: dehydrate(queryClient) };
  },
  component: ListSlugPage,
});
```

**Key pages to migrate**:
- `routes/index.tsx` — Home (collection view)
- `routes/activity.tsx` — Activity feed
- `routes/login.tsx` — Login page
- `routes/auth/reset-password.tsx` — Reset password (needs `searchParams`)
- `routes/auth/verified.tsx` — Email verified
- `routes/link/index.tsx` — My Cosmo Link (auth-protected)
- `routes/link/connect.tsx` — Link connect (auth-protected)
- `routes/list/index.tsx` — My lists (auth-protected)
- `routes/list/$slug.tsx` — List detail
- `routes/live/index.tsx` — Live sessions
- `routes/live/$id.tsx` — Live stream detail
- `routes/terms-privacy.tsx` — Terms & Privacy

### Phase 9: Migrate profile routes

The `/@:nickname` URL pattern requires special handling in TanStack Router. Use a route with `@` prefix:

```tsx
// routes/@$nickname.tsx (layout route)
export const Route = createFileRoute("/@$nickname")({
  loader: async ({ params }) => {
    const profile = await getUserByIdentifier(params.nickname);
    const session = await getSession();
    // build safeProfile...
    return { profile: safeProfile };
  },
  component: ProfileLayout,
});

function ProfileLayout() {
  const { profile } = Route.useLoaderData();
  return (
    <ProfileProvider targetProfile={profile}>
      <PrivateProfileGuard profile={profile}>
        <ProfileBanner profile={profile} />
        <DynamicContainer>
          <div className="flex min-h-screen flex-col gap-4 pt-2 pb-36">
            <ProfileHeader user={profile} />
            <Suspense><ProfileTabs /></Suspense>
            <Outlet />
          </div>
        </DynamicContainer>
      </PrivateProfileGuard>
    </ProfileProvider>
  );
}
```

Child routes:
- `routes/@$nickname/index.tsx` — Profile collection
- `routes/@$nickname/trades.tsx` — Profile trades
- `routes/@$nickname/progress.tsx` — Profile progress
- `routes/@$nickname/stats.tsx` — Profile stats
- `routes/@$nickname/list/index.tsx` — Profile lists
- `routes/@$nickname/list/$slug.tsx` — Profile list detail

### Phase 10: Migrate components (replace next/* imports)

#### `next/navigation` → `@tanstack/react-router`

| Next.js | TanStack Router |
|---|---|
| `useRouter()` | `useRouter()` from `@tanstack/react-router` |
| `usePathname()` | `useRouterState({ select: s => s.location.pathname })` |
| `useSearchParams()` | `useSearch()` from `@tanstack/react-router` |
| `redirect()` | `redirect()` from `@tanstack/react-router` |
| `notFound()` | `notFound()` from `@tanstack/react-router` |
| `<Link href="...">` | `<Link to="...">` from `@tanstack/react-router` |

**Files to update**:
- [`components/client-providers.tsx`](apps/web/src/components/client-providers.tsx) — `useRouter`, `NuqsAdapter`
- [`components/navbar.tsx`](apps/web/src/components/navbar.tsx) — `useTranslations` (next-intl)
- [`components/mobile-navigation.tsx`](apps/web/src/components/mobile-navigation.tsx) — `usePathname`
- [`components/settings-modal.tsx`](apps/web/src/components/settings-modal.tsx) — `useRouter`
- [`components/profile/profile-tabs.tsx`](apps/web/src/components/profile/profile-tabs.tsx) — `usePathname`, `useRouter`
- [`components/filters/filter-selected-artist.tsx`](apps/web/src/components/filters/filter-selected-artist.tsx) — `useRouter`
- [`components/auth/sign-in.tsx`](apps/web/src/components/auth/sign-in.tsx) — `useRouter`
- [`components/auth/reset-password.tsx`](apps/web/src/components/auth/reset-password.tsx) — `useRouter`
- [`components/auth/account/user-account.tsx`](apps/web/src/components/auth/account/user-account.tsx) — `useRouter`
- [`components/user-nav.tsx`](apps/web/src/components/user-nav.tsx) — `useRouter`
- [`components/user-search.tsx`](apps/web/src/components/user-search.tsx) — `useRouter`
- [`components/list/modal/manage-list.tsx`](apps/web/src/components/list/modal/manage-list.tsx) — `useRouter`
- [`components/link/modal/manage-link.tsx`](apps/web/src/components/link/modal/manage-link.tsx) — `useRouter`
- [`components/live/session-list.tsx`](apps/web/src/components/live/session-list.tsx) — `useSearchParams`

#### `next/image` → plain `<img>` or `@unpic/react`

Replace `<Image>` from `next/image` with `<img>` (images are already `unoptimized: true` in Next.js config, so no optimization is lost):

**Files to update**:
- [`components/profile/profile-banner.tsx`](apps/web/src/components/profile/profile-banner.tsx)
- [`components/live/live-ended.tsx`](apps/web/src/components/live/live-ended.tsx)
- [`components/live/custom-player.tsx`](apps/web/src/components/live/custom-player.tsx)
- [`components/live/session-list.tsx`](apps/web/src/components/live/session-list.tsx)
- [`components/link/link-process.tsx`](apps/web/src/components/link/link-process.tsx)
- [`components/objekt/objekt-view.tsx`](apps/web/src/components/objekt/objekt-view.tsx)
- [`components/objekt/objekt-detail.tsx`](apps/web/src/components/objekt/objekt-detail.tsx)
- [`components/objekt/objekt-sidebar.tsx`](apps/web/src/components/objekt/objekt-sidebar.tsx)

#### `next/dynamic` → `React.lazy` + `Suspense`

```tsx
// Before
import dynamic from "next/dynamic";
const Component = dynamic(() => import("./Component"), { ssr: false });

// After
import { lazy, Suspense } from "react";
const Component = lazy(() => import("./Component"));
// Wrap usage in <Suspense fallback={...}>
```

**Files to update**:
- [`components/index/index-view.tsx`](apps/web/src/components/index/index-view.tsx)
- [`components/activity/activity-render.tsx`](apps/web/src/components/activity/activity-render.tsx)
- [`components/profile/profile-objekt.tsx`](apps/web/src/components/profile/profile-objekt.tsx)
- [`components/profile/progress/progress-render.tsx`](apps/web/src/components/profile/progress/progress-render.tsx)
- [`components/profile/stats/stats-render.tsx`](apps/web/src/components/profile/stats/stats-render.tsx)
- [`components/profile/trades/profile-trades.tsx`](apps/web/src/components/profile/trades/profile-trades.tsx)
- [`components/live/live-render.tsx`](apps/web/src/components/live/live-render.tsx)
- [`components/link/modal/manage-link.tsx`](apps/web/src/components/link/modal/manage-link.tsx)

#### `next/script` → plain `<script>`

```tsx
// Before
import Script from "next/script";
<Script src={url} data-website-id={id} />

// After
<script src={url} data-website-id={id} defer />
```

**Files to update**:
- [`components/analytics.tsx`](apps/web/src/components/analytics.tsx)

#### `app/global-error.tsx` → TanStack Router error boundary

Replace with TanStack Router's `errorComponent` in `__root.tsx`.

### Phase 11: Migrate i18n (replace next-intl)

`next-intl` is tightly coupled to Next.js. Options for TanStack Start:

**Recommended approach**: Use `@tanstack/react-router` with a custom i18n context + `react-intl` or `i18next`.

**Simpler approach**: Use `@formatjs/intl` directly with a React context provider.

**Migration steps**:
1. Keep the `messages/en.json` and `messages/ko.json` files as-is
2. Create a custom `I18nProvider` that loads messages based on locale cookie
3. Replace `useTranslations("namespace")` with a custom `useTranslations` hook
4. Replace `getTranslations("namespace")` in server code with a server-side translation function

**Alternative**: Use `next-intl` in standalone mode (it has a non-Next.js mode), but this is less well-supported.

**Recommended**: Use `i18next` + `react-i18next`:
- `i18next` for the core translation engine
- `react-i18next` for React hooks (`useTranslation`)
- Load locale from cookie on server, pass to client via loader data

The `useTranslations("namespace")` pattern maps to `useTranslation("namespace")` in react-i18next.

**Server-side routers** that use `getTranslations` (for error messages):
- [`lib/server/api/routers/user.ts`](apps/web/src/lib/server/api/routers/user.ts)
- [`lib/server/api/routers/profile.ts`](apps/web/src/lib/server/api/routers/profile.ts)
- [`lib/server/api/routers/cosmo-link.ts`](apps/web/src/lib/server/api/routers/cosmo-link.ts)

These can use a server-side `getTranslations(locale, namespace)` helper that loads from the JSON files directly.

### Phase 12: Migrate nuqs URL state

`nuqs` supports TanStack Router natively:

```tsx
// Before (Next.js)
import { NuqsAdapter } from "nuqs/adapters/next/app";

// After (TanStack Router)
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
```

This is a simple adapter swap — no changes needed to the actual `useQueryStates` calls in hooks.

### Phase 13: Set up Vite config and TanStack Start config

**`apps/website/app.config.ts`**:
```ts
import { defineConfig } from "@tanstack/react-start/config";
import viteTsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  tsr: {
    routesDirectory: "./src/routes",
    generatedRouteTree: "./src/routeTree.gen.ts",
  },
  vite: {
    plugins: [
      viteTsConfigPaths({ projects: ["./tsconfig.json"] }),
      tailwindcss(),
    ],
  },
  server: {
    preset: "bun",
  },
});
```

**`apps/website/tsconfig.json`**:
```json
{
  "extends": "@repo/tsconfig/base.json",
  "compilerOptions": {
    "paths": { "@/*": ["./src/*"] },
    "moduleResolution": "bundler",
    "jsx": "react-jsx"
  },
  "include": ["src"]
}
```

### Phase 14: Update monorepo workspace references

**`apps/website/turbo.json`**:
```json
{
  "extends": ["//"],
  "tasks": {
    "dev": { "cache": false, "persistent": true },
    "build": { "dependsOn": ["^build"], "outputs": [".output/**"] },
    "typecheck": { "dependsOn": ["^build"] }
  }
}
```

**Root `package.json`** — Ensure `apps/website` is included in workspaces.

---

## Component-Level Changes Summary

### Components that need NO changes (pure React, no Next.js deps)
Most components in `components/` that don't import from `next/*` or `next-intl` can be copied as-is. These include most filter components, objekt components, UI components, etc.

### Components that need MINOR changes (only `next-intl` → `react-i18next`)
- All components using `useTranslations()` — change to `useTranslation()`
- The hook signature is nearly identical: `const { t } = useTranslation("namespace")`

### Components that need MODERATE changes (navigation)
- Components using `useRouter`, `usePathname`, `useSearchParams` from `next/navigation`
- Replace with TanStack Router equivalents

### Components that need SIGNIFICANT changes
- [`components/client-providers.tsx`](apps/web/src/components/client-providers.tsx) — Multiple Next.js deps
- [`app/layout.tsx`](apps/web/src/app/layout.tsx) → `routes/__root.tsx` — Complete rewrite
- All page files in `app/` → route files in `routes/`

---

## Migration Execution Order

1. **Bootstrap** `apps/website` with `package.json`, `app.config.ts`, `vite.config.ts`, `tsconfig.json`
2. **Copy** `public/`, `messages/`, CSS globals
3. **Migrate** `src/env.ts` (env var prefix change)
4. **Migrate** `src/lib/` server utilities (replace `next/headers`)
5. **Migrate** `src/lib/server/api/` ORPC routers (replace `next-intl/server`)
6. **Create** `src/app/api/` H3 event handlers
7. **Create** `src/routes/__root.tsx` root layout
8. **Migrate** all page routes to `src/routes/`
9. **Copy** `src/components/` and `src/hooks/` with targeted edits
10. **Set up** i18n provider
11. **Update** `nuqs` adapter
12. **Update** monorepo config

---

## Risks and Considerations

1. **`after()` from `next/server`**: Used in `auth.ts` for background user caching. In TanStack Start, use a fire-and-forget pattern or a background queue.

2. **`React.cache()`**: Used for request-level memoization in Next.js. In TanStack Start, this still works but the cache scope may differ. Consider using route loaders instead.

3. **Font loading**: Next.js `next/font/google` handles font optimization. In Vite, use Fontsource packages or CSS `@font-face` with Google Fonts CDN.

4. **`"use server"` directive**: Not needed in TanStack Start — server functions use `createServerFn()` instead.

5. **`"server only"` directive**: Not needed in TanStack Start — use module splitting via Vite.

6. **SSR hydration**: TanStack Start uses `dehydrate`/`HydrationBoundary` from React Query, same as the current approach.

7. **`@` prefix in route paths**: TanStack Router supports literal `@` in route names (e.g., `@$nickname`). Verify this works correctly.

8. **`next-intl` server functions in ORPC routers**: The `getTranslations` calls in server-side routers need a custom implementation that reads locale from cookies and loads JSON messages.

9. **`server-only` package**: The `server-only` npm package is a Next.js convention. In TanStack Start, server code is separated by Vite's SSR bundling — this package can be removed.
