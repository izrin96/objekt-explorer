# Design

## Decision 1: a parameter on the existing read, not a new route

`GET /api/v1/lists/{slug}/entries?address=0x…` reads `{slug}` as the profile slug. The site's own list read (`getListBySlug`) already takes `{ slug, address }` with that meaning, and the service already resolves both through one lookup (`listWhere`). A second route (`/profiles/{address}/lists/{profileSlug}/entries`) would add an operation to the public list for the same response.

## Decision 2: the early read is filed under the list's own slug

`ListView` reads `listEntriesOptions(list.slug, artist)`, and price, ratio, remove and rule edits invalidate by that slug. The loader therefore does not add a second query key. It fetches by address, and once the list read gives the slug it runs the slug's query with a `queryFn` that returns the early result once; a later refetch asks by slug.

## Decision 3: a cached list skips the early read

When the list is already in the query cache its slug is known at once, and its entries are usually cached with it. Asking by address then would download the entries a second time, so the loader checks the list's cache entry first.

## Risks

- The list read gone from the cache while its entries remain: the early read downloads entries the cache already holds. Both entries expire on the same schedule, so this is rare, and it costs a download, not a wrong page.
